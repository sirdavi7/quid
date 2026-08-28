import { NextResponse } from 'next/server'
import { createPublicClient, formatUnits, http } from 'viem'
import { arcTestnet, ARC_USDC_ADDRESS, usdcAbi } from '@/lib/arc'
import { validateAddress } from '@/lib/validation'

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(arcTestnet.rpcUrls.default.http[0])
})

export async function POST(request) {
  try {
    const body = await request.json()
    const walletAddress = String(body.walletAddress ?? '')

    if (!validateAddress(walletAddress)) {
      return NextResponse.json({ error: 'A valid Arc wallet address is required.' }, { status: 400 })
    }

    const rawBalance = await client.readContract({
      address: ARC_USDC_ADDRESS,
      abi: usdcAbi,
      functionName: 'balanceOf',
      args: [walletAddress]
    })

    return NextResponse.json({
      walletAddress,
      chain: 'Arc Testnet',
      asset: 'USDC',
      balance: formatUnits(rawBalance, 6),
      rawBalance: rawBalance.toString()
    })
  } catch (error) {
    return NextResponse.json({ error: error.message ?? 'Arc balance request failed.' }, { status: 500 })
  }
}
