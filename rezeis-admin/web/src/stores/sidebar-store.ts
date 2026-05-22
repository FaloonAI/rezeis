import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Sidebar navigation order store.
 *
 * Uses a draft pattern: changes during edit mode are held in `draftGroupsOrder`
 * and only committed to `groupsOrder` (persisted) when the user clicks "Save".
 * Supports custom user-created categories.
 */

export interface SidebarGroupOrder {
  /** Group key (e.g. 'operations', 'catalog', or user-created like 'custom_1') */
  groupKey: string;
  /** Ordered item keys within this group */
  itemKeys: string[];
  /** Custom label (only for user-created groups; built-in groups use i18n) */
  customLabel?: string;
}

interface SidebarState {
  /** Persisted group ordering. null = use defaults */
  groupsOrder: SidebarGroupOrder[] | null;
  /** Persisted order of groups themselves */
  groupKeyOrder: string[] | null;
  /** Custom group labels (user-created categories) */
  customGroupLabels: Record<string, string>;

  /** Draft state (only active during edit mode, not persisted) */
  draftGroupsOrder: SidebarGroupOrder[] | null;
  /** Whether drag mode is active */
  editMode: boolean;
  /** Whether draft has unsaved changes */
  isDirty: boolean;

  // ── Actions ──
  /** Enter edit mode — snapshot current order into draft */
  startEditing: () => void;
  /** Exit edit mode without saving */
  cancelEditing: () => void;
  /** Save draft to persisted state */
  saveEditing: () => void;
  /** Update draft order (called on every drag) */
  setDraftGroupsOrder: (order: SidebarGroupOrder[]) => void;
  /** Initialize groups order from defaults */
  setGroupsOrder: (order: SidebarGroupOrder[]) => void;
  /** Add a custom category */
  addCustomGroup: (label: string) => void;
  /** Remove a custom category (moves items back to first group) */
  removeCustomGroup: (groupKey: string) => void;
  /** Rename a custom category */
  renameCustomGroup: (groupKey: string, newLabel: string) => void;
  /** Reset everything to defaults */
  resetOrder: () => void;
}

let customGroupCounter = 0;

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      groupsOrder: null,
      groupKeyOrder: null,
      customGroupLabels: {},
      draftGroupsOrder: null,
      editMode: false,
      isDirty: false,

      setGroupsOrder: (order) => set({ groupsOrder: order }),

      startEditing: () => {
        const { groupsOrder } = get();
        set({
          editMode: true,
          draftGroupsOrder: groupsOrder ? structuredClone(groupsOrder) : null,
          isDirty: false,
        });
      },

      cancelEditing: () =>
        set({ editMode: false, draftGroupsOrder: null, isDirty: false }),

      saveEditing: () => {
        const { draftGroupsOrder } = get();
        set({
          groupsOrder: draftGroupsOrder,
          editMode: false,
          draftGroupsOrder: null,
          isDirty: false,
        });
      },

      setDraftGroupsOrder: (order) =>
        set({ draftGroupsOrder: order, isDirty: true }),

      addCustomGroup: (label) => {
        customGroupCounter += 1;
        const key = `custom_${Date.now()}_${customGroupCounter}`;
        const { draftGroupsOrder, customGroupLabels } = get();
        const draft = draftGroupsOrder ? [...draftGroupsOrder] : [];
        draft.push({ groupKey: key, itemKeys: [] });
        set({
          draftGroupsOrder: draft,
          customGroupLabels: { ...customGroupLabels, [key]: label },
          isDirty: true,
        });
      },

      removeCustomGroup: (groupKey) => {
        const { draftGroupsOrder, customGroupLabels } = get();
        if (!draftGroupsOrder) return;

        const group = draftGroupsOrder.find((g) => g.groupKey === groupKey);
        if (!group) return;

        // Move orphaned items to the first group
        const newDraft = draftGroupsOrder
          .filter((g) => g.groupKey !== groupKey)
          .map((g, idx) => {
            if (idx === 0 && group.itemKeys.length > 0) {
              return { ...g, itemKeys: [...g.itemKeys, ...group.itemKeys] };
            }
            return g;
          });

        const newLabels = { ...customGroupLabels };
        delete newLabels[groupKey];

        set({
          draftGroupsOrder: newDraft,
          customGroupLabels: newLabels,
          isDirty: true,
        });
      },

      renameCustomGroup: (groupKey, newLabel) => {
        const { customGroupLabels } = get();
        set({
          customGroupLabels: { ...customGroupLabels, [groupKey]: newLabel },
          isDirty: true,
        });
      },

      resetOrder: () =>
        set({
          groupsOrder: null,
          groupKeyOrder: null,
          customGroupLabels: {},
          draftGroupsOrder: null,
          editMode: false,
          isDirty: false,
        }),
    }),
    {
      name: 'rezeis-sidebar-order',
      partialize: (state) => ({
        groupsOrder: state.groupsOrder,
        groupKeyOrder: state.groupKeyOrder,
        customGroupLabels: state.customGroupLabels,
      }),
    },
  ),
);
