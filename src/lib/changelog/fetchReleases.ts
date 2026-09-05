import { parseReleaseNotes, type ChangelogNode } from './parseReleaseNotes';

/**
 * Reads the changelog straight from the repo's GitHub Releases at runtime.
 *
 * The site is a static build on GitHub Pages, so there is no server to ask:
 * the browser hits the public API directly (the repo is public, no token
 * needed, and api.github.com allows cross-origin reads). The upside over the
 * old bundled CHANGELOG.md is that publishing a release shows up in the app
 * immediately, with no rebuild.
 */

const RELEASES_API_URL = 'https://api.github.com/repos/4less4ndr0/budgeting-matrimoni/releases?per_page=20';
export const RELEASES_PAGE_URL = 'https://github.com/4less4ndr0/budgeting-matrimoni/releases';

/** Deliberately not the zustand key (`budgeting-matrimoni-store`) — this cache is disposable. */
const CACHE_KEY = 'budgeting-matrimoni-releases';
const CACHE_TTL_MS = 60 * 60 * 1000;

export type ReleaseEntry = {
  id: number;
  /** Release name, falling back to the tag when a release was published unnamed. */
  title: string;
  tagName: string;
  htmlUrl: string;
  nodes: ChangelogNode[];
};

type GitHubRelease = {
  id: number;
  name: string | null;
  tag_name: string;
  html_url: string;
  body: string | null;
  draft: boolean;
};

type Cache = { fetchedAt: number; entries: ReleaseEntry[] };

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : null;
  } catch {
    // Private browsing or corrupted entry: just go to the network.
    return null;
  }
}

function writeCache(entries: ReleaseEntry[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), entries } satisfies Cache));
  } catch {
    // Cache is an optimization, never a requirement.
  }
}

function toEntry(release: GitHubRelease): ReleaseEntry {
  return {
    id: release.id,
    title: release.name?.trim() || release.tag_name,
    tagName: release.tag_name,
    htmlUrl: release.html_url,
    nodes: parseReleaseNotes(release.body),
  };
}

export async function fetchReleases(): Promise<ReleaseEntry[]> {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.entries;

  try {
    const response = await fetch(RELEASES_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`GitHub API ha risposto ${response.status}`);

    const entries = ((await response.json()) as GitHubRelease[]).filter((r) => !r.draft).map(toEntry);
    writeCache(entries);
    return entries;
  } catch (error) {
    // Offline, or the 60 req/h unauthenticated limit: a stale list still beats
    // an empty dialog, since the changelog is read-only reference material.
    if (cached) return cached.entries;
    throw error;
  }
}
