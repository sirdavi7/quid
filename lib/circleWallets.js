import { randomUUID } from 'crypto'
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'
import { ARC_USDC_ADDRESS } from './arc'
import { chainOptions, chains } from './chains'

export const GATEWAY_WALLET_EVM_TESTNET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9'

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

export async function createQuidGatewayWallet() {
  const hasCircleConfig =
    process.env.CIRCLE_API_KEY &&
    process.env.CIRCLE_ENTITY_SECRET &&
    process.env.CIRCLE_WALLET_SET_ID

  if (!hasCircleConfig) {
    return {
      id: `mock_EVM-TESTNET_${randomUUID()}`,
      address: mockWalletAddress(),
      blockchain: 'EVM-TESTNET',
      accountType: 'EOA',
      mocked: true
    }
  }

  const client = createCircleWalletsClient()
  const response = await client.createWallets({
    idempotencyKey: randomUUID(),
    accountType: process.env.CIRCLE_WALLET_ACCOUNT_TYPE ?? 'EOA',
    blockchains: ['EVM-TESTNET'],
    count: 1,
    walletSetId: process.env.CIRCLE_WALLET_SET_ID
  })
  const wallet = response.data?.wallets?.[0]

  if (!wallet?.id || !wallet.address) {
    throw new Error('Circle did not return a Gateway wallet address.')
  }

  for (const chain of chainOptions) {
    const derivedResponse = await client.deriveWallet({
      id: wallet.id,
      blockchain: chain.circleBlockchain
    })
    const derivedWallet = derivedResponse.data?.wallet

    if (!derivedWallet?.address || derivedWallet.address.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(`Circle could not derive the Gateway wallet for ${chain.label}.`)
    }
  }

  return {
    id: wallet.id,
    address: wallet.address,
    blockchain: wallet.blockchain ?? 'EVM-TESTNET',
    accountType: wallet.accountType ?? 'EOA',
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

function normalizeCircleTransactionPayload(payload, chainId) {
  const transaction = payload?.transaction ?? payload
  const txHash = transaction?.txHash ?? transaction?.transactionHash ?? transaction?.hash

  return {
    ...payload,
    id: transaction?.id ?? payload?.id,
    state: transaction?.state ?? transaction?.status ?? payload?.state ?? payload?.status,
    txHash,
    transactionHash: txHash,
    blockNumber: transaction?.blockNumber ?? transaction?.blockHeight ?? payload?.blockNumber ?? payload?.blockHeight ?? null,
    explorerUrl: txHash ? getExplorerUrlForChain(chainId, txHash) : payload?.explorerUrl ?? null
  }
}

export function isFailedCircleTransaction(state) {
  return ['FAILED', 'DENIED', 'CANCELLED'].includes(String(state ?? '').toUpperCase())
}

export function isCompletedCircleTransaction(state) {
  // Circle's CONFIRMED state is still transitional. Only a terminal COMPLETE
  // state means Quid may call the Circle Wallet transaction confirmed.
  return ['COMPLETE', 'COMPLETED'].includes(String(state ?? '').toUpperCase())
}

export function getExplorerUrlForChain(chainId, txHash) {
  const chain = chains.find((item) => item.id === Number(chainId))
  const explorer = chain?.blockExplorers?.default?.url?.replace(/\/$/, '')

  return txHash && explorer ? `${explorer}/tx/${txHash}` : null
}

export async function getCircleTransactionDetails(transactionId, chainId) {
  const client = createCircleWalletsClient()
  const response = await client.getTransaction({ id: transactionId })

  return normalizeCircleTransactionPayload(response.data, chainId)
}

async function waitForCircleTransactionCompletion(client, transactionId, label, chainId) {
  let latest = null

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await client.getTransaction({ id: transactionId })
    latest = normalizeCircleTransactionPayload(response.data, chainId)

    if (isFailedCircleTransaction(latest.state)) {
      throw new Error(`${label} ${String(latest.state).toLowerCase()}.`)
    }

    if (isCompletedCircleTransaction(latest.state)) {
      return latest
    }

    await sleep(1500)
  }

  throw new Error(`${label} is still processing. Check Gateway balance before submitting another deposit.`)
}

function toUsdcBaseUnits(amount) {
  const [whole, fraction = ''] = String(amount).trim().split('.')
  const normalizedWhole = whole || '0'
  const normalizedFraction = `${fraction}000000`.slice(0, 6)

  return `${normalizedWhole}${normalizedFraction}`
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

function mediumNetworkFee(estimate) {
  const data = estimate?.data?.data ?? estimate?.data ?? estimate ?? {}

  return data.medium?.networkFee ?? null
}

export async function estimateCircleWalletGatewayDepositFees({ walletId, usdcAddress, amount }) {
  const client = createCircleWalletsClient()
  const baseUnits = toUsdcBaseUnits(amount)
  const [approval, deposit] = await Promise.all([
    client.estimateContractExecutionFee({
      contractAddress: usdcAddress,
      abiFunctionSignature: 'approve(address,uint256)',
      abiParameters: [GATEWAY_WALLET_EVM_TESTNET, baseUnits],
      source: { walletId }
    }),
    client.estimateContractExecutionFee({
      contractAddress: GATEWAY_WALLET_EVM_TESTNET,
      abiFunctionSignature: 'deposit(address,uint256)',
      abiParameters: [usdcAddress, baseUnits],
      source: { walletId }
    })
  ])

  return {
    approval: mediumNetworkFee(approval),
    deposit: mediumNetworkFee(deposit)
  }
}

export async function estimateCircleWalletUsdcTransferFee({ walletId, recipientAddress, amount }) {
  const client = createCircleWalletsClient()
  const balance = await getCircleWalletUsdcBalance(walletId)
  const response = await client.estimateTransferFee({
    walletId,
    tokenId: balance.tokenId || undefined,
    tokenAddress: balance.tokenId ? undefined : balance.tokenAddress,
    destinationAddress: recipientAddress,
    amount: [amount]
  })

  return mediumNetworkFee(response)
}

export async function submitCircleWalletUsdcToGateway({
  walletId,
  chainId,
  usdcAddress,
  amount,
  approvalIdempotencyKey = randomUUID(),
  depositIdempotencyKey = randomUUID()
}) {
  const client = createCircleWalletsClient()
  const baseUnits = toUsdcBaseUnits(amount)

  const approvalResponse = await client.createContractExecutionTransaction({
    idempotencyKey: approvalIdempotencyKey,
    walletId,
    contractAddress: usdcAddress,
    abiFunctionSignature: 'approve(address,uint256)',
    abiParameters: [GATEWAY_WALLET_EVM_TESTNET, baseUnits],
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' }
    }
  })
  const approval = normalizeCircleTransactionPayload(approvalResponse.data, chainId)

  if (!approval.id) {
    throw new Error('Circle did not return an approval transaction for this Gateway deposit.')
  }

  await waitForCircleTransactionCompletion(client, approval.id, 'USDC approval', chainId)

  const depositResponse = await client.createContractExecutionTransaction({
    idempotencyKey: depositIdempotencyKey,
    walletId,
    contractAddress: GATEWAY_WALLET_EVM_TESTNET,
    abiFunctionSignature: 'deposit(address,uint256)',
    abiParameters: [usdcAddress, baseUnits],
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' }
    }
  })
  const created = normalizeCircleTransactionPayload(depositResponse.data, chainId)

  if (!created.id) {
    throw new Error('Circle did not return a Gateway deposit transaction.')
  }

  // The deposit has been accepted by Circle but is not yet final. Persist its
  // Circle transaction ID now; the lifecycle reconciler will mark it confirmed
  // only after Circle reports COMPLETE and gives Quid the chain receipt.
  return created
}

export async function sendArcUsdcFromCircleWallet({ walletId, recipientAddress, amount, idempotencyKey = randomUUID() }) {
  const client = createCircleWalletsClient()
  const balance = await getCircleWalletUsdcBalance(walletId)

  if (balance.amount < Number(amount)) {
    throw new Error(`Insufficient USDC balance on Arc Testnet. Available: ${balance.amount} USDC, required: ${amount} USDC.`)
  }

  const response = await client.createTransaction({
    idempotencyKey,
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

  const created = normalizeCircleTransactionPayload(response.data, chainOptions[0].id)

  if (!created.id) {
    throw new Error('Circle did not return a withdrawal transaction.')
  }

  return created
}
