'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { ethers } from 'ethers'
import { PushNameService as PushProtocolService } from '../lib/pushProtocol'
import PushNameServiceContract from '../lib/pushNameServiceContract'
import { getChainConfig, getContractAddresses, getPushProtocolAddresses, formatDomainName, isValidDomainName } from '../config/chains'

interface DomainSearchResult {
  name: string
  isAvailable: boolean
  owner?: string
  expiresAt?: number
  isUniversal?: boolean
  ipfsHash?: string
}

export default function PushNameService() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResult, setSearchResult] = useState<DomainSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [makeUniversal, setMakeUniversal] = useState(true)
  const [pushService, setPushService] = useState<PushProtocolService | null>(null)
  const [contract, setContract] = useState<PushNameServiceContract | null>(null)
  const [registrationCost, setRegistrationCost] = useState<string>('0')

  // Initialize Push Protocol and contract
  useEffect(() => {
    if (isConnected && address && chainId) {
      const initializeServices = async () => {
        try {
          // Initialize Push Protocol
          const pushConfig = {
            env: process.env.NEXT_PUBLIC_PUSH_ENV as 'prod' | 'staging' | 'dev' || 'staging',
            account: address
          }
          
          const pushServiceInstance = new PushProtocolService(pushConfig)
          await pushServiceInstance.initialize()
          setPushService(pushServiceInstance)

          // Initialize contract
          const contractAddresses = getContractAddresses(chainId)
          if (contractAddresses?.nameService && window.ethereum) {
            try {
              const provider = new ethers.BrowserProvider(window.ethereum)
              const signer = await provider.getSigner()
              
              const contractInstance = new PushNameServiceContract(
                contractAddresses.nameService,
                signer,
                chainId,
                pushConfig
              )
              await contractInstance.initialize()
              setContract(contractInstance)

              // Get registration cost
              const cost = await contractInstance.getRegistrationCost()
              setRegistrationCost(ethers.formatEther(cost))
            } catch (error) {
              console.error('Failed to initialize contract:', error)
            }
          }
        } catch (error) {
          console.error('Failed to initialize services:', error)
        }
      }

      initializeServices()
    }
  }, [isConnected, address, chainId])

  const searchDomain = async () => {
    if (!contract || !searchTerm.trim()) return

    setIsSearching(true)
    try {
      const cleanName = searchTerm.toLowerCase().replace(/\.push$/, '')
      
      if (!isValidDomainName(cleanName)) {
        setSearchResult({
          name: cleanName,
          isAvailable: false
        })
        return
      }

      const isAvailable = await contract.isAvailable(cleanName)
      
      if (isAvailable) {
        setSearchResult({
          name: cleanName,
          isAvailable: true
        })
      } else {
        const domainInfo = await contract.getDomainInfo(cleanName)
        setSearchResult({
          name: cleanName,
          isAvailable: false,
          owner: domainInfo.owner,
          expiresAt: Number(domainInfo.expiresAt),
          isUniversal: domainInfo.isUniversal,
          ipfsHash: domainInfo.ipfsHash
        })
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResult({
        name: searchTerm,
        isAvailable: false
      })
    } finally {
      setIsSearching(false)
    }
  }

  const registerDomain = async () => {
    if (!contract || !searchResult?.isAvailable) return

    setIsRegistering(true)
    try {
      const cost = await contract.getRegistrationCost()
      const tx = await contract.register(searchResult.name, makeUniversal, cost)
      
      console.log('Registration transaction:', tx.hash)
      await tx.wait()
      
      // Refresh search result
      await searchDomain()
      
      // Show success notification
      alert(`Successfully registered ${formatDomainName(searchResult.name)}!`)
    } catch (error) {
      console.error('Registration failed:', error)
      alert('Registration failed. Please try again.')
    } finally {
      setIsRegistering(false)
    }
  }

  const chainConfig = chainId ? getChainConfig(chainId) : null
  const contractAddresses = chainId ? getContractAddresses(chainId) : null

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Push Name Service</h1>
          <p className="text-xl text-gray-600 mb-8">
            Register your .push domain on multiple blockchains
          </p>
          <p className="text-lg">Please connect your wallet to continue</p>
        </div>
      </div>
    )
  }

  if (!chainConfig) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Push Name Service</h1>
          <p className="text-xl text-red-600 mb-8">
            This network is not supported by Push Protocol
          </p>
          <p className="text-lg">Please switch to Push Chain Donut, Ethereum Sepolia, Polygon, BSC, Arbitrum, or Optimism</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Push Name Service</h1>
        <p className="text-xl text-gray-600 mb-4">
          Register your .push domain powered by Push Protocol
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <span>Network: {chainConfig?.name}</span>
          <span>•</span>
          <span>Registration: {registrationCost} {chainConfig?.currency}</span>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Search Domain</h2>
        
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter domain name (without .push)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && searchDomain()}
            />
            <p className="text-sm text-gray-500 mt-1">
              Domain will be: {searchTerm ? formatDomainName(searchTerm.toLowerCase().replace(/\.push$/, '')) : 'yourname.push'}
            </p>
          </div>
          <button
            onClick={searchDomain}
            disabled={isSearching || !searchTerm.trim()}
            className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Result */}
        {searchResult && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {formatDomainName(searchResult.name)}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                searchResult.isAvailable 
                  ? 'bg-pink-100 text-pink-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {searchResult.isAvailable ? 'Available' : 'Taken'}
              </span>
            </div>

            {searchResult.isAvailable ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="makeUniversal"
                    checked={makeUniversal}
                    onChange={(e) => setMakeUniversal(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="makeUniversal" className="text-sm">
                    Make this domain universal (cross-chain transferable)
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-medium">
                      Cost: {registrationCost} {chainConfig?.currency}
                    </p>
                    <p className="text-sm text-gray-500">
                      Valid for 1 year • {makeUniversal ? 'Universal' : 'Single chain'} domain
                    </p>
                  </div>
                  <button
                    onClick={registerDomain}
                    disabled={isRegistering}
                    className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRegistering ? 'Registering...' : 'Register Domain'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p><strong>Owner:</strong> {searchResult.owner}</p>
                {searchResult.expiresAt && (
                  <p><strong>Expires:</strong> {new Date(searchResult.expiresAt * 1000).toLocaleDateString()}</p>
                )}
                <p><strong>Type:</strong> {searchResult.isUniversal ? 'Universal (Cross-Chain)' : 'Single Chain'}</p>
                {searchResult.ipfsHash && (
                  <p><strong>IPFS:</strong> {searchResult.ipfsHash}</p>
                )}
                
                {/* Cross-chain transfer button for owned universal domains */}
                {searchResult.owner?.toLowerCase() === address?.toLowerCase() && searchResult.isUniversal && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">🌐 Cross-Chain Transfer</h4>
                    <p className="text-sm text-purple-600 mb-3">
                      This universal domain can be transferred to other supported chains
                    </p>
                    <button
                      onClick={() => {
                        // TODO: Implement cross-chain transfer modal
                        alert('Cross-chain transfer feature coming soon!')
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      Transfer to Another Chain
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Push Protocol Features</h3>
          <ul className="space-y-2 text-gray-600">
            <li>• Cross-chain domain transfers</li>
            <li>• Push notifications for domain events</li>
            <li>• Decentralized chat for domain owners</li>
            <li>• IPFS content hosting</li>
            <li>• DNS-like record management</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Supported Networks</h3>
          <ul className="space-y-2 text-gray-600">
            <li>• Push Chain Donut (Main Hub) 🍩</li>
            <li>• Ethereum Sepolia (Testnet)</li>
            <li>• Ethereum Mainnet</li>
            <li>• Polygon</li>
            <li>• BSC (Binance Smart Chain)</li>
            <li>• Arbitrum</li>
            <li>• Optimism</li>
          </ul>
        </div>
      </div>

      {/* Push Chain Status */}
      {chainId === 42101 && (
        <div className="mt-8 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg p-6 border-2 border-pink-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🍩</span>
            <h3 className="text-xl font-semibold">Push Chain Donut Testnet</h3>
            <span className="px-2 py-1 bg-pink-200 text-pink-800 rounded-full text-xs font-medium">ACTIVE</span>
          </div>
          <p className="text-gray-700 mb-4">
            You're connected to Push Chain, the main hub for universal .push domains! 
            Domains registered here can be transferred to any supported blockchain using Universal Transactions.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 text-pink-800">🌟 Universal Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Cross-chain domain transfers</li>
                <li>• Universal Ethereum Accounts (UEA)</li>
                <li>• Push notifications</li>
                <li>• Decentralized messaging</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-purple-800">⚡ Low Fees</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Registration: {registrationCost} PC</li>
                <li>• Transfer: 0.0001 PC</li>
                <li>• Cross-chain: 0.001 PC</li>
                <li>• Marketplace: 0.0001 PC</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Push Protocol Info */}
      <div className="mt-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-2">Powered by Push Protocol</h3>
        <p className="text-gray-700 mb-4">
          Push Protocol enables decentralized communication and notifications across multiple blockchains. 
          Your .push domain comes with built-in messaging, notifications, and cross-chain capabilities.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">🚀 Quick Start</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Add Push Chain Donut to MetaMask</li>
              <li>• Get test tokens from faucet</li>
              <li>• Register your first .push domain</li>
              <li>• Enable universal features</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🌐 Universal Domains</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Work across all supported chains</li>
              <li>• Cross-chain transfers via UEA</li>
              <li>• Push notifications</li>
              <li>• IPFS website hosting</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          <a 
            href="https://push.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            Push Protocol →
          </a>
          <a 
            href="https://docs.push.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            Documentation →
          </a>
          <a 
            href="https://faucet.push.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            Get Test Tokens →
          </a>
          <a 
            href="https://donut.push.network" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            Block Explorer →
          </a>
          <a 
            href={`https://donut.push.network/address/${contractAddresses?.nameService}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-pink-600 hover:text-pink-800 font-medium"
          >
            View Contract →
          </a>
        </div>
      </div>
    </div>
  )
}