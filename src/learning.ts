export interface InfoCard { id: string; title: string; icon: string; text: string; source?: string }
export const CONTEXT_CARDS: InfoCard[] = [
  { id: 'mae-tha', title: 'Mae Tha cooperative', icon: '🌱', text: 'Founded in 1986, Mae Tha helps members escape debt by pooling, checking and distributing mixed organic vegetables.' },
  { id: 'covid', title: 'Food without a market', icon: '🏪', text: 'COVID closures left farmers with food and no market.' },
  { id: 'floods-2024', title: 'The 2024 floods', icon: '🌊', text: 'Severe floods in Chiang Mai destroyed crops and cut off markets and roads. Food and transport were both affected.' },
  { id: 'food-council', title: 'The Food Council', icon: '🤝', text: 'The Food Council links city, university and community groups, coordinating food deliveries, buyers and transport so food keeps reaching people during crises.' },
]
export const EVENT_CARDS: Record<string, InfoCard> = {
  normal: { id: 'normal', title: 'Everyday distribution', icon: '🚚', text: 'A busy market alone does not guarantee households get fed.' },
  flood: { id: 'flood', title: 'Flood: roads matter', icon: '🌊', text: 'Floods cut roads and damage crops, while food stored on higher ground survives.' },
  marketClosure: { id: 'marketClosure', title: 'Market closure', icon: '🏪', text: 'During COVID the markets shut, but schools, hospitals and community kitchens still needed food.' },
  warning: { id: 'warning', title: 'A forecast is uncertain', icon: '☁️', text: 'Preparing for an uncertain forecast costs money now.' },
  festival: { id: 'festival', title: 'Festival opportunity', icon: '🎉', text: 'Festival prices rise, but households still need food.' },
}
export const CHANNEL_CARDS: InfoCard[] = [
  { id: 'hub', title: 'Community food hub/kitchen', icon: '🍲', text: 'Food shared to the community food hub/kitchen is handed out to people who need it; the Food Council helps coordinate and fund these deliveries.' },
  { id: 'contract', title: 'School or hospital contract', icon: '🏥', text: 'School and hospital promises reserve next round’s food, but disruptions can cut deliveries.' },
  { id: 'warehouse', title: 'Your stored food', icon: '📦', text: 'Food you store stays in your own farm storage, ready to release to the community hub during a disruption.' },
]
export const FACTS: InfoCard[] = [
  { id: 'fact-1', title: 'Chiang Mai food system', icon: '🌱', text: 'Chiang Mai gets much of its food through a single central market by the river, and floods there are becoming more frequent.', source: "Fieldwork, Prof Piyapong's lecture" },
  { id: 'fact-2', title: 'Chiang Mai food system', icon: '🌱', text: 'During COVID, many locals lost their income and queued for food from the government and the wealthy.', source: "Fieldwork, Prof Piyapong's lecture" },
  { id: 'fact-3', title: 'Chiang Mai food system', icon: '🌱', text: 'Thai agribusiness firms advance seeds, fertiliser and feed, and farmers repay by selling the harvest back at a fixed price.', source: "FFTC, via the group's workshop" },
  { id: 'fact-4', title: 'Chiang Mai food system', icon: '🌱', text: 'Contract farmers usually have no say over which crop they grow or its price.', source: 'Group workshop' },
  { id: 'fact-5', title: 'Chiang Mai food system', icon: '🌱', text: 'Mae Tha was started in 1986 to pull farmers out of debt.', source: "SCMP, via the group's workshop" },
  { id: 'fact-6', title: 'Chiang Mai food system', icon: '🌱', text: 'About 130 Mae Tha members decide together what to grow: over 100 crops a year.', source: 'Fieldwork, Mae Tha visit' },
  { id: 'fact-7', title: 'Chiang Mai food system', icon: '🌱', text: 'Mixed crops keep pests down, while monocultures push farmers toward chemicals.', source: 'Fieldwork' },
  { id: 'fact-8', title: 'Chiang Mai food system', icon: '🌱', text: 'Converting land to organic takes about 3 years for the soil to recover.', source: 'Group workshop' },
  { id: 'fact-9', title: 'Chiang Mai food system', icon: '🌱', text: 'PGS organic inspection costs about 300 baht per hectare.', source: 'Fieldwork' },
  { id: 'fact-10', title: 'Chiang Mai food system', icon: '🌱', text: 'Organic food can cost 3-4x more, and most locals buy on price.', source: 'Fieldwork' },
  { id: 'fact-11', title: 'Chiang Mai food system', icon: '🌱', text: "Food contamination is one of Chiang Mai's six main problems.", source: "Fieldwork, Prof Piyapong's lecture" },
  { id: 'fact-12', title: 'Chiang Mai food system', icon: '🌱', text: 'Mae Tha turns off-size vegetables into products so nothing goes to waste.', source: 'Fieldwork, Mae Tha visit' },
];

export function pickRoundFact(result: import('./round2/types').Resolution, used: string[]): InfoCard | null {
  const preferred = result.event.kind === 'flood' ? [1,7] : result.event.kind === 'marketClosure' ? [2,4,10] : result.round === 1 ? [8,3,5] : result.waste > 0 ? [12,10] : [6,9,11]
  return [...preferred.map(i=>FACTS.find(f=>f.id===`fact-${i}`)!), ...FACTS].find(f=>!used.includes(f.id)) ?? null
}
export const ALL_CARDS = [...CONTEXT_CARDS, ...Object.values(EVENT_CARDS), ...CHANNEL_CARDS, ...FACTS]
export const ROUND_STEPS = ['Event', 'Grow', 'Decide', 'Council', 'Reveal'] as const
export const DEBRIEF_QUESTIONS = [
  ['Your choices', 'When did you choose cash over feeding the city, and why?'],
  ['Preparing', 'What would you have done differently if you had trusted the flood forecast?'],
  ['Distribution', 'The farms grew enough food. Why did households still go hungry, or what kept them fed?'],
  ['Mae Tha', 'How did the Mae Tha community reserve and farm storage change what happened in a crisis?'],
  ['The Food Council', "What should the Council have done earlier, and what can a real food council do that farmers can’t?"],
  ['Real life', 'Where did this game feel realistic, and what did it leave out?'],
  ['Farmer roles', 'How did company debt and organic costs change the choices each farmer could make?'],
  ['Affordability', 'When was food too expensive for people even though it was there? Who paid for a fair farmer price?'],
  ['Policy', 'Which policy reduced shortages most, and who paid for it?'],
  ['Our model', 'Which arrow in our causal loop diagram would you redraw after playing?'],
] as const
// "Why?" behind each option card: the real-world reason, 2–3 sentences.
export const OPTION_WHY = {
  sell: 'Markets pay the best price when buyers are there, but people only buy what they can afford. Selling does not reach households who cannot pay market prices, so it does not raise the share of people with access to food.',
  company: 'The company advanced your seeds and fertiliser, so it takes produce first to repay, then buys the rest at a fixed price. Contract farmers usually have no say over the crop or the price.',
  share: 'Community kitchens feed people who cannot afford market prices, so they can only pay farmers a little, with Food Council funds. In a crisis the Council pays more because food is scarce and urgently needed.',
  store: 'Storage lets you hold food for a disruption, like the 2024 floods that cut roads and markets. Fresh vegetables still decay, and storage costs money every round.',
  release: 'Food stored before a flood or market closure can still reach the community hub when markets cannot. That is why preparing early matters.',
  promise: 'Schools and hospitals need steady supplies, so they pay a fixed fair price for promised food. When floods cut roads or markets close, deliveries break and only half gets through.',
  reserve: 'Mae Tha members pool food in a shared reserve as a community safety net. The Council pays to move it to the hub when planned food falls short.',
} as const
// Organic trap story for Mae Tha members in round 1 (one panel each; numbers come from config).
export const ORGANIC_STORY = {
  soil: (fraction: number) => `Your soil needs time to recover from chemicals. ${fraction === 0.5 ? 'Half' : `${fraction * 100}%`} harvest this year.`,
  certificate: (cost: number) => cost ? `The organic certificate costs $${cost} every round.` : 'Under this policy the organic certificate is free.',
  buyers: 'Organic sells for more, but most locals can’t afford it.',
  ending: 'Organic pays off later. Contract farming pays now but locks you in debt.',
} as const
