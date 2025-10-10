"use client";

import React from 'react';
import styled from 'styled-components';
import { FaCheck, FaSpinner, FaEthereum, FaPen } from 'react-icons/fa';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface GaslessProgressProps {
  currentStep: 'payment' | 'signature' | 'processing' | 'completed';
  isVisible: boolean;
}

const ProgressContainer = styled.div<{ isVisible: boolean }>`
  display: ${props => props.isVisible ? 'block' : 'none'};
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  backdrop-filter: blur(10px);
`;

const ProgressTitle = styled.h3`
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  text-align: center;
`;

const StepsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StepItem = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: ${props => {
    switch (props.status) {
      case 'completed': return 'rgba(34, 197, 94, 0.2)';
      case 'active': return 'rgba(59, 130, 246, 0.2)';
      case 'error': return 'rgba(239, 68, 68, 0.2)';
      default: return 'rgba(255, 255, 255, 0.05)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.status) {
      case 'completed': return 'rgba(34, 197, 94, 0.3)';
      case 'active': return 'rgba(59, 130, 246, 0.3)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  transition: all 0.3s ease;
`;

const StepIcon = styled.div<{ status: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.status) {
      case 'completed': return '#22c55e';
      case 'active': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return 'rgba(255, 255, 255, 0.2)';
    }
  }};
  color: white;
  font-size: 14px;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.div<{ status: string }>`
  color: ${props => {
    switch (props.status) {
      case 'completed': return '#22c55e';
      case 'active': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return 'rgba(255, 255, 255, 0.7)';
    }
  }};
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 2px;
`;

const StepDescription = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  line-height: 1.3;
`;

const SpinnerIcon = styled(FaSpinner)`
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export const GaslessProgress: React.FC<GaslessProgressProps> = ({ 
  currentStep, 
  isVisible 
}) => {
  const getStepStatus = (stepId: string): 'pending' | 'active' | 'completed' | 'error' => {
    const stepOrder = ['payment', 'signature', 'processing', 'completed'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStepIcon = (stepId: string, status: string) => {
    if (status === 'completed') return <FaCheck />;
    if (status === 'active') return <SpinnerIcon />;
    
    switch (stepId) {
      case 'payment': return <FaEthereum />;
      case 'signature': return <FaPen />;
      case 'processing': return <SpinnerIcon />;
      case 'completed': return <FaCheck />;
      default: return null;
    }
  };

  const steps: Step[] = [
    {
      id: 'payment',
      title: 'Pay Domain Fee',
      description: 'Send 0.001 ETH for domain registration',
      icon: <FaEthereum />,
      status: getStepStatus('payment')
    },
    {
      id: 'signature',
      title: 'Sign Registration',
      description: 'Sign message to authorize gasless registration',
      icon: <FaPen />,
      status: getStepStatus('signature')
    },
    {
      id: 'processing',
      title: 'Processing',
      description: 'Registering domain on Push Chain...',
      icon: <SpinnerIcon />,
      status: getStepStatus('processing')
    }
  ];

  return (
    <ProgressContainer isVisible={isVisible}>
      <ProgressTitle>Gasless Registration Progress</ProgressTitle>
      <StepsList>
        {steps.map((step) => (
          <StepItem key={step.id} status={step.status}>
            <StepIcon status={step.status}>
              {getStepIcon(step.id, step.status)}
            </StepIcon>
            <StepContent>
              <StepTitle status={step.status}>
                {step.title}
              </StepTitle>
              <StepDescription>
                {step.description}
              </StepDescription>
            </StepContent>
          </StepItem>
        ))}
      </StepsList>
    </ProgressContainer>
  );
};