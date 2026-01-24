import { describe, expect, it } from 'vitest'
import { buildTagTree } from './tagTree'

describe('buildTagTree', () => {
  it('creates siblings under shared parent and preserves indentation depth', () => {
    const tags = [
      ['Géographie/Capitales/Europe'],
      ['Géographie/Drapeaux/Europe']
    ]

    const tree = buildTagTree(tags)
    const geo = tree.children.find((node) => node.path === 'Géographie')

    expect(geo).toBeTruthy()
    expect(geo?.children.map((child) => child.path)).toEqual([
      'Géographie/Capitales',
      'Géographie/Drapeaux'
    ])

    const capitales = geo?.children[0]
    const drapeaux = geo?.children[1]

    expect(capitales?.children[0].path).toBe('Géographie/Capitales/Europe')
    expect(drapeaux?.children[0].path).toBe('Géographie/Drapeaux/Europe')
  })
})
