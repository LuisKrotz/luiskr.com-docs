/**
 * @file coverage/docs-tails-tree-tab-crumb.test.js
 * @description Coverage tails for the Docs.tsx treeview roving-tabstop
 * accessor, the pickNode group/dir/file dispatch, and the crumb-input
 * Escape arm — the tab-stop match arm, the three node branches, and the
 * non-Enter crumb key path.
 */
import { describe, test, expect, jest, afterEach } from '@jest/globals'
import { ViewDocs } from '@docs/Docs.js'
import { mount } from '@tests/fixtures/test-constants.js'
import { createMockGL } from '@tests/fixtures/mock-webgl.js'
import router from '@core/router/router.js'
import { VIEW_TAGS } from '@core/tokens/elements/views.js'
import { ROUTE_PATHS } from '@core/tokens/routes/paths.js'
import { ROUTE_NAMES } from '@core/tokens/routes/names.js'
import { DOCS_CLASSES } from '@core/tokens/classes/docs.js'
import { DATA_ATTRS } from '@core/tokens/attrs/data.js'
import { KEYBOARD_EVENTS, MOUSE_EVENTS } from '@core/tokens/events/dom.js'
import { KEYS } from '@core/tokens/primitives.js'
import { ATTR_VALUES } from '@core/tokens/attrs/values.js'
import { CHAR_STRINGS } from '@core/tokens/strings/chars.js'

/** Route-record factory for the docs portal — params.docsPath carries the sub-path. */
const docsRoute = (docsPath = '') => ({
  name: ROUTE_NAMES.DOCS,
  view: VIEW_TAGS.VIEW_DOCS,
  lang: 'en',
  path: `${ROUTE_PATHS.DOCS}${docsPath ? `/${docsPath}` : ''}`,
  meta: { docsRoute: true },
  params: { docsPath },
})

describe('docs tree-tab + crumb — coverage tails', () => {
  let origRoute
  let origGetContext

  afterEach(() => {
    if (origRoute) router.currentRoute = origRoute

    if (origGetContext) {
      const proto = window.HTMLCanvasElement?.prototype || HTMLCanvasElement.prototype

      proto.getContext = origGetContext
      origGetContext = null
    }
  })
  test('treeTabIndex returns the tab-stop value only on the roving path', () => {
    const view = new ViewDocs()

    view._treeTabPath = 'src'

    expect(view.treeTabIndex('src')).toBe(ATTR_VALUES.TABINDEX_ZERO)
    expect(view.treeTabIndex('docs')).toBe(ATTR_VALUES.NEGATIVE_TABINDEX)
  })

  test('pickNode toggles section groups in place without navigating', () => {
    const view = new ViewDocs()
    const toggleSpy = jest.spyOn(view, 'toggleDir').mockImplementation(() => {})
    const navSpy = jest.spyOn(view, 'navigateDocs').mockImplementation(() => {})

    view.pickNode({ type: 'dir', name: 'docs', path: 'docs', children: [], group: true })

    expect(toggleSpy).toHaveBeenCalledWith('docs')
    expect(navSpy).not.toHaveBeenCalled()
  })

  test('pickNode opens non-group dirs before navigating to them', () => {
    const view = new ViewDocs()
    const navSpy = jest.spyOn(view, 'navigateDocs').mockImplementation(() => {})

    view.pickNode({ type: 'dir', name: 'architecture', path: 'docs/architecture' })

    expect(view.isDirOpen('docs/architecture')).toBe(true)
    expect(navSpy).toHaveBeenCalledWith('docs/architecture')
  })

  test('pickNode navigates file nodes without touching expansion state', () => {
    const view = new ViewDocs()
    const navSpy = jest.spyOn(view, 'navigateDocs').mockImplementation(() => {})

    view.pickNode({ type: 'file', name: 'website.md', path: 'docs/website.md' })

    expect(view.isDirOpen('docs/website.md')).toBe(false)
    expect(navSpy).toHaveBeenCalledWith('docs/website.md')
  })

  test('onCrumbKey Escape restores the input to the live path and blurs', () => {
    const view = new ViewDocs()

    view.docsPath = 'docs/architecture'

    const input = document.createElement('input')

    input.value = 'typed/elsewhere'

    const blurSpy = jest.spyOn(input, 'blur')

    view.onCrumbKey({ key: KEYS.ESCAPE, target: input })

    expect(input.value).toBe(`${CHAR_STRINGS.SLASH}${view.docsPath}`)
    expect(blurSpy).toHaveBeenCalled()
  })

  test('onCrumbKey ignores keys outside the Enter/Escape commit set', () => {
    const view = new ViewDocs()
    const navSpy = jest.spyOn(view, 'navigateDocs').mockImplementation(() => {})

    const input = document.createElement('input')

    input.value = 'typed/elsewhere'

    const blurSpy = jest.spyOn(input, 'blur')

    view.onCrumbKey({ key: KEYS.TAB, target: input })

    expect(navSpy).not.toHaveBeenCalled()
    expect(blurSpy).not.toHaveBeenCalled()
    expect(input.value).toBe('typed/elsewhere')
  })

  test('onUpdated keeps the chrome unfallbacked when the GL strip mounts', () => {
    origRoute = router.currentRoute

    const proto = window.HTMLCanvasElement?.prototype || HTMLCanvasElement.prototype

    origGetContext = proto.getContext

    const mockGL = createMockGL()

    proto.getContext = function patched(type) {
      if (/webgl/i.test(String(type))) return mockGL

      return null
    }

    router.currentRoute = docsRoute()

    const view = new ViewDocs()
    const cleanup = mount(view)

    expect(view._glHandle).toBeTruthy()
    expect(view.classList.contains(DOCS_CLASSES.DOCS_GL_FALLBACK)).toBe(false)

    cleanup()
    view._glHandle?.destroy()
  })

  test('focusing a tree row moves the roving tab stop onto its path', () => {
    origRoute = router.currentRoute
    router.currentRoute = docsRoute()

    const view = new ViewDocs()
    const cleanup = mount(view)
    const row = view.shadowRoot.querySelector(`.${DOCS_CLASSES.DOCS_TREE_ITEM}`)
    const path = row.getAttribute(DATA_ATTRS.DATA_PATH)

    row.focus()

    expect(view._treeTabPath).toBe(path)

    cleanup()
  })

  test('focusing the crumb input selects the whole path for retyping', () => {
    origRoute = router.currentRoute
    router.currentRoute = docsRoute()

    const view = new ViewDocs()
    const cleanup = mount(view)
    const input = view.shadowRoot.querySelector(`.${DOCS_CLASSES.DOCS_CRUMB_EDIT}`)
    const selectSpy = jest.spyOn(input, 'select')

    input.focus()

    expect(selectSpy).toHaveBeenCalled()

    cleanup()
  })

  test('root render with no sections emits no grid region', () => {
    origRoute = router.currentRoute
    router.currentRoute = docsRoute()

    const view = new ViewDocs()
    const cleanup = mount(view)

    jest.spyOn(view, 'rootsAsNodes').mockReturnValue([])
    view._updateDom()

    expect(view.shadowRoot.querySelector(`.${DOCS_CLASSES.DOCS_GRID}`)).toBeFalsy()

    cleanup()
  })

  test('modified click on a leaf tree anchor keeps native semantics', () => {
    origRoute = router.currentRoute
    router.currentRoute = docsRoute()

    const view = new ViewDocs()
    const cleanup = mount(view)

    // Expand a section so a leaf <a> row exists, then ctrl+click it — the
    // handler must bail before preventDefault/pickTreeNode.
    view.toggleDir('docs')
    view._updateDom()

    const anchor = [...view.shadowRoot.querySelectorAll(`.${DOCS_CLASSES.DOCS_TREE_ITEM}`)].find(
      (el) => el.tagName === 'A'
    )

    const pickSpy = jest.spyOn(view, 'pickTreeNode').mockImplementation(() => {})
    const ev = new MouseEvent(MOUSE_EVENTS.CLICK, {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    })

    anchor.dispatchEvent(ev)

    expect(ev.defaultPrevented).toBe(false)
    expect(pickSpy).not.toHaveBeenCalled()

    cleanup()
  })

  test('keydown inside a dir child grid routes through onGridKey', async () => {
    origRoute = router.currentRoute
    router.currentRoute = docsRoute('docs/sassdoc')

    const view = new ViewDocs()
    const cleanup = mount(view)

    view.onRouteParamChange({ params: { docsPath: 'docs/sassdoc' } })
    await new Promise((r) => setTimeout(r, 0))
    view._updateDom()

    const grid = view.shadowRoot.querySelector(`.${DOCS_CLASSES.DOCS_GRID}`)
    const keySpy = jest.spyOn(view, 'onGridKey')

    grid.dispatchEvent(
      new KeyboardEvent(KEYBOARD_EVENTS.KEYDOWN, { key: KEYS.ARROW_DOWN, bubbles: true })
    )

    expect(keySpy).toHaveBeenCalled()

    cleanup()
  })

  test('keydown inside the root sections grid routes through onGridKey', () => {
    origRoute = router.currentRoute
    router.currentRoute = docsRoute()

    const view = new ViewDocs()
    const cleanup = mount(view)
    const grid = view.shadowRoot.querySelector(`.${DOCS_CLASSES.DOCS_GRID}`)
    const keySpy = jest.spyOn(view, 'onGridKey')

    grid.dispatchEvent(
      new KeyboardEvent(KEYBOARD_EVENTS.KEYDOWN, { key: KEYS.ARROW_DOWN, bubbles: true })
    )

    expect(keySpy).toHaveBeenCalled()

    cleanup()
  })

  test('plain click on a leaf tree anchor navigates via pickTreeNode', () => {
    origRoute = router.currentRoute
    router.currentRoute = docsRoute()

    const view = new ViewDocs()
    const cleanup = mount(view)

    view.toggleDir('docs')
    view._updateDom()

    const anchor = [...view.shadowRoot.querySelectorAll(`.${DOCS_CLASSES.DOCS_TREE_ITEM}`)].find(
      (el) => el.tagName === 'A'
    )
    const pickSpy = jest.spyOn(view, 'pickTreeNode').mockImplementation(() => {})
    const ev = new MouseEvent(MOUSE_EVENTS.CLICK, {
      bubbles: true,
      cancelable: true,
    })

    anchor.dispatchEvent(ev)

    expect(ev.defaultPrevented).toBe(true)
    expect(pickSpy).toHaveBeenCalled()

    cleanup()
  })
})
