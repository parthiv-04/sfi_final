import type { Decision, Resolution, ResolutionLine } from './round2/types'

/** Explain recorded outcomes, without implying that a forecast or preview was guaranteed. */
export function decisionFeedback(result: Resolution, line: ResolutionLine, choice: Decision): string[] {
  const feedback: string[] = []
  if (line.companyRotten > 0) feedback.push(`The market closed: ${line.companyRotten} crates taken by the company spoiled. Payment reached you, but this food did not reach households.`)
  else if (choice.card === 'sell' && line.companyUnits === 0 && line.spoilage > 0) feedback.push(`${line.spoilage} crates spoiled: buyers or transport could not take all your food. A high selling price does not guarantee a sale.`)
  if (line.contractShortfall > 0) feedback.push(`Your school or hospital promise fell short by ${line.contractShortfall} crates because disruption or limited harvest or transport reduced delivery.`)
  if (choice.card === 'store' && line.stored > 0) feedback.push(`You kept ${line.stored} crates for a later disruption. Storage earns nothing now and costs money; some food decays.`)
  if (choice.card === 'release' && line.warehouseReleased > 0) feedback.push(`${line.warehouseReleased} stored crates reached the kitchen. Preparing earlier gave you food to send now.`)
  if (choice.card === 'share') feedback.push(line.hubUnits > 0 ? `${line.hubUnits} crates reached the kitchen because food, transport and Council funding were available.` : 'Your sharing plan delivered no food: harvest, transport or Council funding was insufficient.')
  if ((line.councilContribution ?? 0) > 0) feedback.push(`You gave $${line.councilContribution} to delivery funding. The Council spent $${result.councilSpent} in total; food and usable roads were still needed.`)
  if (!feedback.length) feedback.push(line.companyUnits > 0 ? 'The company took its repayment first and bought the remaining produce. Your income rose, but company sales do not directly feed the vulnerable households shown here.' : 'Market buyers paid for your food. Vulnerable households need an affordable route such as the kitchen or school and hospital deliveries.')
  return feedback
}
