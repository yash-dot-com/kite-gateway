import type { Route } from "./types.js";

// ── Trie Node ───────────────────────────────────────────────────

interface TrieNode {
  children: Map<string, TrieNode>;
  paramChild?: { node: TrieNode; paramName: string };
  wildcardChild?: TrieNode;
  handlers: Map<string, Route>; // method → route
}

function createNode(): TrieNode {
  return {
    children: new Map(),
    handlers: new Map(),
  };
}

// ── Router ──────────────────────────────────────────────────────

export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

export class Router {
  private root: TrieNode = createNode();

  register(route: Route): void {
    const segments = this.normalizePath(route.path).split("/").filter(Boolean);
    let node = this.root;

    for (const segment of segments) {
      if (segment === "*") {
        // Wildcard — match everything after this
        if (!node.wildcardChild) {
          node.wildcardChild = createNode();
        }
        node = node.wildcardChild;
        break; // wildcard consumes everything
      } else if (segment.startsWith(":")) {
        // Parameterized segment
        const paramName = segment.slice(1);
        if (!node.paramChild) {
          node.paramChild = { node: createNode(), paramName };
        }
        node = node.paramChild.node;
      } else {
        // Static segment
        if (!node.children.has(segment)) {
          node.children.set(segment, createNode());
        }
        node = node.children.get(segment)!;
      }
    }

    // Register for each method
    for (const method of route.methods) {
      node.handlers.set(method.toUpperCase(), route);
    }
  }

  lookup(method: string, path: string): RouteMatch | null {
    const segments = this.normalizePath(path).split("/").filter(Boolean);
    const params: Record<string, string> = {};

    const result = this.search(this.root, segments, 0, params);
    if (!result) return null;

    const route = result.handlers.get(method.toUpperCase());
    if (!route) return null;

    return { route, params: { ...params } };
  }

  private search(
    node: TrieNode,
    segments: string[],
    index: number,
    params: Record<string, string>
  ): TrieNode | null {
    // Base case — consumed all segments
    if (index === segments.length) {
      if (node.handlers.size > 0) return node;
      return null;
    }

    const segment = segments[index];

    // 1. Try exact match first (highest priority)
    if (node.children.has(segment)) {
      const result = this.search(
        node.children.get(segment)!,
        segments,
        index + 1,
        params
      );
      if (result) return result;
    }

    // 2. Try param match
    if (node.paramChild) {
      const prevValue = params[node.paramChild.paramName];
      params[node.paramChild.paramName] = segment;
      const result = this.search(
        node.paramChild.node,
        segments,
        index + 1,
        params
      );
      if (result) return result;
      // Backtrack
      if (prevValue !== undefined) {
        params[node.paramChild.paramName] = prevValue;
      } else {
        delete params[node.paramChild.paramName];
      }
    }

    // 3. Try wildcard (lowest priority, matches rest)
    if (node.wildcardChild) {
      return node.wildcardChild;
    }

    return null;
  }

  private normalizePath(path: string): string {
    // Remove trailing slash (but keep root /)
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return path;
  }
}
