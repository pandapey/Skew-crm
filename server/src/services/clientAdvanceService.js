import { Transaction } from '../models/financeModels.js'

export async function recordAdvancePayment(client, amount, actorName) {
  const advance = Number(amount)
  if (!client?.company || !Number.isFinite(advance) || advance <= 0) return null
  const reference = `ADV-${client.clientId}`
  const already = await Transaction.exists({
    type: 'Income',
    category: 'Project Advance',
    party: client.company,
    reference,
  })
  if (already) return null
  return Transaction.create({
    title: `Advance payment - ${client.company}`,
    type: 'Income',
    category: 'Project Advance',
    amount: advance,
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    method: client.paymentMode || 'Bank Transfer',
    party: client.company,
    reference,
    notes: `Auto-recorded on client onboarding by ${actorName || 'System'}.`,
  })
}

export default recordAdvancePayment
