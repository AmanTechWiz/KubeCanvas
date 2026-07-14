/**
 * Z-index scale for the editor UI.
 *
 * All floating elements must use one of these values.
 * Raw z-index numbers are banned — use this file instead.
 *
 * Layer order (low → high):
 *   canvas     0     React Flow canvas
 *   panel     50     Floating toolbars (shape panel, canvas controls)
 *   sidebar   60     Slide-out sidebars, navbar overlay
 *   overlay   70     Collaborator avatars, save indicator
 *   dropdown  80     Dropdown menus, pickers
 *   modal    100     Dialog backdrops
 *   dialog   110     Dialog cards
 *   cursor  9999     Agent cursor, drag preview
 */
export const Z = {
  canvas: 0,
  panel: 50,
  sidebar: 60,
  overlay: 70,
  dropdown: 80,
  modal: 100,
  dialog: 110,
  cursor: 9999,
} as const
