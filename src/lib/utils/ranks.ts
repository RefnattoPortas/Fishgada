import { Fish, Waves, Compass, Crown, Anchor } from 'lucide-react'
import { ReactNode } from 'react'

export interface RankInfo {
  title: string
  color: string
  icon: any
  minLevel: number
  maxLevel: number
  phrases: string[]
}

export const USER_RANKS: RankInfo[] = [
  {
    title: 'Alevino',
    color: '#94a3b8',
    icon: Fish,
    minLevel: 1,
    maxLevel: 3,
    phrases: ['Começando a história no WikiFish!', 'O primeiro de muitos.', 'O futuro mestre está nascendo.']
  },
  {
    title: 'Pescador de Barranco',
    color: '#b45309',
    icon: Anchor,
    minLevel: 4,
    maxLevel: 7,
    phrases: ['Paciência e persistência no trecho.', 'O segredo é a leitura da água.', 'No barranco se aprende a pescar.']
  },
  {
    title: 'Mestre do Rio',
    color: '#f59e0b',
    icon: Waves,
    minLevel: 8,
    maxLevel: 12,
    phrases: ['O rio não tem segredos para quem sabe ouvir.', 'Domínio total da batida.', 'Nas águas onde o peixe mora.']
  },
  {
    title: 'Guia da Região',
    color: '#06b6d4',
    icon: Compass,
    minLevel: 13,
    maxLevel: 19,
    phrases: ['Conheço cada curva dessas águas.', 'O GPS humano do WikiFish.', 'Siga quem conhece o caminho.']
  },
  {
    title: 'Lenda do Pantanal',
    color: '#ec4899',
    icon: Crown,
    minLevel: 20,
    maxLevel: 999,
    phrases: ['Respeite quem conhece o trecho.', 'As águas se curvam à lenda.', 'O topo da cadeia alimentar.']
  }
]

export function getRankByLevel(level: number): RankInfo {
  return USER_RANKS.find(r => level >= r.minLevel && level <= r.maxLevel) || USER_RANKS[0]
}
