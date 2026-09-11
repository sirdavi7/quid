import { NextResponse } from 'next/server'
import { createPublicClient, formatUnits, http } from 'viem'
import { chains, chainOptions } from '@/lib/chains'
import { usdcAbi } from '@/lib/arc'
import { validateAddress } from '@/lib/validation'
import { getSafeApiError, logServerError } from '@/lib/user-errors'

export async function POST(request) {
  try {
    const body = await request.json()
    const walletAddress = String(body.walletAddress ?? '')
    const chainId = Number(body.chainId)
    const option = chainOptions.find((item) => item.id === chainId)
    const chain = chains.find((item) => item.id === chainId)

    if (!validateAddress(walletAddress)) {
      return NextResponse.json({ error: 'A valid wallet address is required.' }, { status: 400 })
    }

    if (!option || !chain?.rpcUrls?.default?.http?.[0] || !option.usdcAddress) {
      return NextResponse.json({ error: 'Choose a supported USDC test chain.' }, { status: 400 })
    }

    const client = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0])
    })

    const rawBalance = await client.readContract({
      address: option.usdcAddress,
      abi: usdcAbi,
      functionName: 'balanceOf',
      args: [walletAddress]
    })

    return NextResponse.json({
      walletAddress,
      chainId: option.id,
      chain: option.label,
      gatewayName: option.gatewayName,
      asset: 'USDC',
      balance: formatUnits(rawBalance, 6),
      rawBalance: rawBalance.toString()
    })
  } catch (error) {
    logServerError('Chain balance', error)
    return NextResponse.json({ error: getSafeApiError(error, { fallback: 'This received wallet balance is unavailable right now. Try again in a moment.' }) }, { status: 500 })
  }
}
