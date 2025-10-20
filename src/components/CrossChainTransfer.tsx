'use client'

import React, { useState } from 'react'
import styled from 'styled-components'
import { FiX } from 'react-icons/fi'
import { ethers } from 'ethers'
import { useAccount } from 'wagmi'

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`

const ModalContent = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 30px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
`

const Title = styled.h2`
  color: white;
  font-size: 24px;
  font-weight: bold;
  margin: 0;
`

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`

const Section = styled.div`
  margin-bottom: 20px;
`

const Label = styled.label`
  display: block;
  color: white;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
`

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  font-size: 16px;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    border-color: #00d2ff;
    background: rgba(255, 255, 255, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`

const Button = styled.button`
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #22c55e 0%, #065f46 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(34, 197, 94, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    background: rgba(255, 255, 255, 0.2);
  }
`

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #ef4444;
  font-size: 14px;
  text-align: center;
`

interface CrossChainTransferProps {
  domainName: string
  currentOwner: string
  isOpen: boolean
  onClose: () => void
}

export default function CrossChainTransfer({ isOpen, onClose, domainName, currentOwner }: CrossChainTransferProps) {
  const { address } = useAccount()

  const [recipientAddress, setRecipientAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleTransfer = async () => {
    if (!address || !recipientAddress || !domainName) {
      setError('Missing required information: address, recipient, or domain name')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate recipient address
      if (!ethers.isAddress(recipientAddress)) {
        throw new Error('Invalid recipient address')
      }

      if (recipientAddress.toLowerCase() === address.toLowerCase()) {
        throw new Error('Cannot transfer to your own address')
      }

      console.log('📤 Initiating domain transfer with Universal Signer...')
      console.log('- Domain:', domainName)
      console.log('- From:', address)
      console.log('- To:', recipientAddress)

      // Import universal signer
      const { universalSigner } = await import('@/lib/universalSigner')
      
      // Execute transfer using universal signer
      const result = await universalSigner.transferDomain(
        domainName.replace('.push', ''),
        recipientAddress
      )
      
      console.log('✅ Domain transfer completed:', result.txHash)
      
      setSuccess(`🎉 Domain transfer completed!\n\nTransaction: ${result.txHash}`)
      
      // Close modal after success
      setTimeout(() => {
        onClose()
      }, 3000)
      
    } catch (error: any) {
      console.error('❌ Domain transfer failed:', error)
      
      let errorMessage = 'Transfer failed. Please try again.'
      
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was rejected by user.'
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transfer and gas fees.'
      } else if (error.reason) {
        errorMessage = `Transfer failed: ${error.reason}`
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContent>
        <Header>
          <Title>📤 Domain Transfer</Title>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </Header>

        <Section>
          <Label>Domain Name</Label>
          <Input 
            value={`${domainName}.push`} 
            disabled 
            style={{ opacity: 0.7 }}
          />
        </Section>

        <Section>
          <Label>📍 Recipient Address</Label>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
            Enter the wallet address that will receive the domain on Push Chain:
          </div>
          <Input
            type="text"
            placeholder="0x1234567890123456789012345678901234567890"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />
        </Section>

        <Section>
          <div style={{ 
            background: 'rgba(34, 197, 94, 0.1)', 
            border: '1px solid rgba(34, 197, 94, 0.3)', 
            borderRadius: '12px', 
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px', color: '#22c55e' }}>
              📤 Universal Transfer Details
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>🏠 Network:</span>
              <span style={{ color: '#00d2ff', fontWeight: '600' }}>Push Chain Donut</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>⚡ Signing Method:</span>
              <span style={{ color: '#00d2ff', fontWeight: '600' }}>Universal Signer</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>💰 Transfer Fee:</span>
              <span style={{ color: '#00d2ff', fontWeight: '600' }}>0.0001 PC</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>⏱️ Estimated Time:</span>
              <span style={{ color: '#00d2ff', fontWeight: '600' }}>~30 seconds</span>
            </div>
          </div>
        </Section>

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        {success && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#22c55e',
            fontSize: '0.9rem',
            textAlign: 'center',
            whiteSpace: 'pre-line'
          }}>
            {success}
          </div>
        )}

        <Button
          onClick={handleTransfer}
          disabled={
            isLoading || 
            !address ||
            !recipientAddress || 
            !ethers.isAddress(recipientAddress)
          }
        >
          {isLoading ? '📤 Processing Transfer...' : '📤 Transfer Domain'}
        </Button>
      </ModalContent>
    </Modal>
  )
}