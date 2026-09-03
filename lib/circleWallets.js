import { randomUUID } from 'crypto'
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'
import { ARC_USDC_ADDRESS } from './arc'
import { chainOptions } from './chains'

function mockWalletAddress() {
  const chars = '0123456789abcdef'
  let address = '0x'
  for (let i = 0; i < 40; i += 1) {
    address += chars[Math.floor(Math.random() * chars.length)]
  }
  return address
}

export async function createQuidWallet() {
  const wallets = await createQuidWallets()
  const arcWallet = wallets.find((wallet) => wallet.circleBlockchain === 'ARC-TESTNET') ?? wallets[0]

  return {
    id: arcWallet.id,
    address: arcWallet.address,
    blockchain: arcWallet.blockchain,
    accountType: arcWallet.accountType,
    mocked: arcWallet.mocked
  }
}

export async function createQuidWallets() {
  const hasCircleConfig =
    process.env.CIRCLE_API_KEY &&
    process.env.CIRCLE_ENTITY_SECRET &&
    process.env.CIRCLE_WALLET_SET_ID

  if (!hasCircleConfig) {
    return chainOptions.map((chain) => ({
      id: `mock_${chain.circleBlockchain}_${randomUUID()}`,
      address: mockWalletAddress(),
      blockchain: chain.circleBlockchain,
      circleBlockchain: chain.circleBlockchain,
      chainId: chain.id,
      chainLabel: chain.label,
      gatewayName: chain.gatewayName,
      usdcAddress: chain.usdcAddress,
      accountType: 'EOA',
      mocked: true
    }))
  }

  const client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET
  })

  const walletResults = await Promise.all(
    chainOptions.map(async (chain) => {
      const response = await client.createWallets({
        idempotencyKey: randomUUID(),
        accountType: process.env.CIRCLE_WALLET_ACCOUNT_TYPE ?? 'EOA',
        blockchains: [chain.circleBlockchain],
        count: 1,
        walletSetId: process.env.CIRCLE_WALLET_SET_ID
      })

      const wallet = response.data?.wallets?.[0]
      if (!wallet?.address) {
        throw new Error(`Circle did not return a wallet address for ${chain.label}.`)
      }

      return {
        id: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain,
        circleBlockchain: chain.circleBlockchain,
        chainId: chain.id,
        chainLabel: chain.label,
        gatewayName: chain.gatewayName,
        usdcAddress: chain.usdcAddress,
        accountType: wallet.accountType,
        mocked: false
      }
    })
  )

  return walletResults
}

export async function createQuidWalletForChain(chain) {
  const hasCircleConfig =
    process.env.CIRCLE_API_KEY &&
    process.env.CIRCLE_ENTITY_SECRET &&
    process.env.CIRCLE_WALLET_SET_ID

  if (!hasCircleConfig) {
    return {
      id: `mock_${chain.circleBlockchain}_${randomUUID()}`,
      address: mockWalletAddress(),
      blockchain: chain.circleBlockchain,
      circleBlockchain: chain.circleBlockchain,
      chainId: chain.id,
      chainLabel: chain.label,
      gatewayName: chain.gatewayName,
      usdcAddress: chain.usdcAddress,
      accountType: 'EOA',
      mocked: true
    }
  }

  const client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET
  })

  const response = await client.createWallets({
    idempotencyKey: randomUUID(),
    accountType: process.env.CIRCLE_WALLET_ACCOUNT_TYPE ?? 'EOA',
    blockchains: [chain.circleBlockchain],
    count: 1,
    walletSetId: process.env.CIRCLE_WALLET_SET_ID
  })

  const wallet = response.data?.wallets?.[0]
  if (!wallet?.address) {
    throw new Error(`Circle did not return a wallet address for ${chain.label}.`)
  }

  return {
    id: wallet.id,
    address: wallet.address,
    blockchain: wallet.blockchain,
    circleBlockchain: chain.circleBlockchain,
    chainId: chain.id,
    chainLabel: chain.label,
    gatewayName: chain.gatewayName,
    usdcAddress: chain.usdcAddress,
    accountType: wallet.accountType,
    mocked: false
  }
}

function createCircleWalletsClient() {
  if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_ENTITY_SECRET) {
    throw new Error('Circle API key and entity secret are required.')
  }

  return initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeCircleTransactionPayload(payload) {
  const transaction = payload?.transaction ?? payload
  const txHash = transaction?.txHash ?? transaction?.transactionHash ?? transaction?.hash

  return {
    ...payload,
    id: transaction?.id ?? payload?.id,
    state: transaction?.state ?? transaction?.status ?? payload?.state ?? payload?.status,
    txHash,
    transactionHash: txHash,
    explorerUrl: txHash ? `https://testnet.arcscan.app/tx/${txHash}` : payload?.explorerUrl ?? null
  }
}

function isFailedCircleTransaction(state) {
  return ['FAILED', 'DENIED', 'CANCELLED'].includes(String(state ?? '').toUpperCase())
}

export async function getCircleTransactionDetails(transactionId) {
  const client = createCircleWalletsClient()
  const response = await client.getTransaction({ id: transactionId })

  return normalizeCircleTransactionPayload(response.data)
}

async function waitForCircleTransactionHash(transactionId) {
  let latest = null

  for (let attempt = 0; attempt < 12; attempt += 1) {
    latest = await getCircleTransactionDetails(transactionId)

    if (latest.txHash || isFailedCircleTransaction(latest.state)) {
      break
    }

    await sleep(1000)
  }

  return latest
}

function getTokenAddress(tokenBalance) {
  return tokenBalance?.tokenAddress ?? tokenBalance?.token?.tokenAddress ?? tokenBalance?.token?.address
}

function getTokenId(tokenBalance) {
  return tokenBalance?.tokenId ?? tokenBalance?.token?.id ?? tokenBalance?.id
}

function getTokenAmount(tokenBalance) {
  return Number(tokenBalance?.amount ?? tokenBalance?.balance ?? tokenBalance?.confirmedBalance ?? 0)
}

function isUsdcToken(tokenBalance) {
  const symbol = tokenBalance?.token?.symbol ?? tokenBalance?.symbol
  const tokenAddress = getTokenAddress(tokenBalance)

  return (
    String(symbol ?? '').toUpperCase() === 'USDC' ||
    String(tokenAddress ?? '').toLowerCase() === ARC_USDC_ADDRESS.toLowerCase()
  )
}

export async function getCircleWalletUsdcBalance(walletId) {
  const client = createCircleWalletsClient()
  const response = await client.getWalletTokenBalance({
    id: walletId,
    includeAll: true
  })
  const tokenBalances = response.data?.tokenBalances ?? []
  const usdc = tokenBalances.find(isUsdcToken)

  return {
    amount: getTokenAmount(usdc),
    tokenId: getTokenId(usdc),
    tokenAddress: getTokenAddress(usdc) ?? ARC_USDC_ADDRESS
  }
}

export async function sendArcUsdcFromCircleWallet({ walletId, recipientAddress, amount }) {
  const client = createCircleWalletsClient()
  const balance = await getCircleWalletUsdcBalance(walletId)

  if (balance.amount < Number(amount)) {
    throw new Error(`Insufficient USDC balance on Arc Testnet. Available: ${balance.amount} USDC, required: ${amount} USDC.`)
  }

  const response = await client.createTransaction({
    idempotencyKey: randomUUID(),
    walletId,
    tokenId: balance.tokenId,
    tokenAddress: balance.tokenId ? undefined : balance.tokenAddress,
    destinationAddress: recipientAddress,
    amount: [amount],
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' }
    }
  })

  const created = normalizeCircleTransactionPayload(response.data)

  if (!created.id) {
    return created
  }

  const resolved = await waitForCircleTransactionHash(created.id)

  if (isFailedCircleTransaction(resolved?.state)) {
    throw new Error(`Circle withdrawal ${String(resolved.state).toLowerCase()}.`)
  }

  return {
    ...created,
    ...resolved,
    id: created.id
  }
}
