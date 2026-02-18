import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import type { ReactNode } from 'react';

import SpellingListAssignmentPanel from './SpellingListAssignmentPanel';

type Learner = {
  id: string;
  display_name: string;
  level_current: number;
  percentile?: number;
};

type Assignment = {
  kid_id: string;
  is_enabled: boolean | null;
  weight: number | null;
};

type AssignmentState = {
  isEnabled: boolean;
  weight: number;
};

function asArray(value: ReactNode): ReactNode[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value == null ? [] : [value];
}

function textContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textContent).join(' ');
  }

  if (!node || typeof node !== 'object' || !('props' in node)) {
    return '';
  }

  const element = node as { props?: { children?: ReactNode } };
  return textContent(element.props?.children ?? null);
}

function findElements(
  node: ReactNode,
  predicate: (element: { type: unknown; props: Record<string, unknown> }) => boolean
): Array<{ type: unknown; props: Record<string, unknown> }> {
  const found: Array<{ type: unknown; props: Record<string, unknown> }> = [];

  const visit = (value: ReactNode) => {
    for (const child of asArray(value)) {
      if (!child || typeof child !== 'object' || !('props' in child) || !('type' in child)) {
        continue;
      }

      const element = child as { type: unknown; props: Record<string, unknown> };
      if (predicate(element)) {
        found.push(element);
      }
      visit(element.props.children as ReactNode);
    }
  };

  visit(node);
  return found;
}

function renderPanel({
  listId = 'list-1',
  learners = [],
  assignments = [],
}: {
  listId?: string;
  learners?: Learner[];
  assignments?: Assignment[];
}) {
  let currentState: Record<string, AssignmentState> = {};
  const setState = vi.fn((next: Record<string, AssignmentState> | ((prev: Record<string, AssignmentState>) => Record<string, AssignmentState>)) => {
    currentState = typeof next === 'function' ? next(currentState) : next;
  });
  const setPending = vi.fn();
  const setError = vi.fn();

  vi.spyOn(React, 'useMemo').mockImplementation((factory: () => unknown) => factory());

  let useStateCalls = 0;
  vi.spyOn(React, 'useState').mockImplementation((initial: unknown) => {
    useStateCalls += 1;
    if (useStateCalls === 1) {
      currentState = initial as Record<string, AssignmentState>;
      return [currentState, setState];
    }
    if (useStateCalls === 2) {
      return [null, setPending];
    }
    return [null, setError];
  });

  const tree = SpellingListAssignmentPanel({ listId, learners, assignments });

  return {
    tree,
    setState,
    setPending,
    setError,
  };
}

describe('SpellingListAssignmentPanel', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it('renders empty state message', () => {
    const { tree } = renderPanel({ learners: [], assignments: [] });

    expect(textContent(tree)).toContain('No learners found. Add a learner from the dashboard first.');
  });

  it('renders all provided learners', () => {
    const { tree } = renderPanel({
      learners: [
        { id: 'kid-1', display_name: 'Avery', level_current: 3 },
        { id: 'kid-2', display_name: 'Jordan', level_current: 4 },
      ],
    });

    const content = textContent(tree);
    expect(content).toContain('Avery');
    expect(content).toContain('Jordan');
  });

  it('calls assign API when checkbox is toggled', async () => {
    const { tree } = renderPanel({
      listId: 'list-abc',
      learners: [{ id: 'kid-1', display_name: 'Avery', level_current: 3 }],
      assignments: [{ kid_id: 'kid-1', is_enabled: false, weight: 4 }],
    });

    const checkbox = findElements(
      tree,
      element => element.type === 'input' && element.props.type === 'checkbox'
    )[0];

    (checkbox.props.onChange as (event: { target: { checked: boolean } }) => void)({
      target: { checked: true },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/spelling/lists/list-abc/assign');
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({
      kidId: 'kid-1',
      isEnabled: true,
      weight: 4,
    });
  });

  it('calls assign API when weight input changes', async () => {
    const { tree } = renderPanel({
      listId: 'list-def',
      learners: [{ id: 'kid-1', display_name: 'Avery', level_current: 3 }],
      assignments: [{ kid_id: 'kid-1', is_enabled: true, weight: 1 }],
    });

    const weightInput = findElements(
      tree,
      element => element.type === 'input' && element.props.type === 'number'
    )[0];

    (weightInput.props.onChange as (event: { target: { value: string } }) => void)({
      target: { value: '7' },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/spelling/lists/list-def/assign');
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({
      kidId: 'kid-1',
      isEnabled: true,
      weight: 7,
    });
  });
});
