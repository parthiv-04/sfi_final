export interface InfoCard { id: string; title: string; icon: string; text: string }
export const CONTEXT_CARDS: InfoCard[] = [
  { id: 'mae-tha', title: 'Mae Tha cooperative', icon: '🌱', text: 'Started in 1986 near Chiang Mai to help farmers escape debt from contract farming. Members grow mixed organic vegetables. The co-op pools, checks and distributes their produce.' },
  { id: 'covid', title: 'Food without a market', icon: '🏪', text: 'During COVID-19, Chiang Mai fresh markets closed when they became infection clusters. Farmers still had food, but lost their place to sell it.' },
  { id: 'floods-2024', title: 'The 2024 floods', icon: '🌊', text: 'Severe floods in Chiang Mai destroyed crops and cut off markets and roads. Food and transport were both affected.' },
  { id: 'food-council', title: 'The Food Council', icon: '🤝', text: 'Chiang Mai has a food policy council bringing together the city, university and community. They work to keep food available, especially in a crisis.' },
]
export const EVENT_CARDS: Record<string, InfoCard> = {
  normal: { id: 'normal', title: 'Everyday distribution', icon: '🚚', text: 'Even in a normal week, food must reach households. A busy market alone does not guarantee everyone gets fed.' },
  flood: { id: 'flood', title: 'Flood: roads matter', icon: '🌊', text: 'Floods hit growing crops and cut roads. Stored food on higher ground survives.' },
  marketClosure: { id: 'marketClosure', title: 'Market closure', icon: '🏪', text: 'During COVID the markets shut, but schools, hospitals and community kitchens still needed food.' },
  warning: { id: 'warning', title: 'A forecast is uncertain', icon: '☁️', text: 'Forecasts are never certain. Preparing costs money now and might not be needed.' },
  festival: { id: 'festival', title: 'Festival opportunity', icon: '🎉', text: 'More buyers, higher prices. A good round to earn, but does the city still get fed?' },
}
export const CHANNEL_CARDS: InfoCard[] = [
  { id: 'hub', title: 'Emergency hub', icon: '🍲', text: 'Like a community kitchen run by the Food Council. Your food goes directly to people who need it.' },
  { id: 'contract', title: 'School or hospital contract', icon: '🏥', text: 'Like a school or hospital ordering ahead. A promise made now reserves food for next round, but floods and market closures disrupt delivery.' },
  { id: 'warehouse', title: 'Your stored food', icon: '📦', text: "Mae Tha’s own stock. Preparing food in advance keeps another route open during disruptions." },
]
export const ALL_CARDS = [...CONTEXT_CARDS, ...Object.values(EVENT_CARDS), ...CHANNEL_CARDS]
export const ROUND_STEPS = ['Event', 'Grow', 'Decide', 'Council', 'Reveal'] as const
export const DEBRIEF_QUESTIONS = [
  ['Your choices', 'When did you choose cash over feeding the city, and why?'],
  ['Preparing', 'What would you have done differently if you had trusted the flood forecast?'],
  ['Distribution', 'The farms grew enough food. Why did households still go hungry, or what kept them fed?'],
  ['Mae Tha', 'How did the shared reserve and warehouse change what happened in a crisis?'],
  ['The Food Council', "What should the Council have done earlier, and what can a real food council do that farmers can’t?"],
  ['Real life', 'Where did this game feel realistic, and what did it leave out?'],
  ['Our model', 'Which arrow in our causal loop diagram would you redraw after playing?'],
] as const
