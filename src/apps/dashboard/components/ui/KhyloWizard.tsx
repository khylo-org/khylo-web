import React, { type FC, type ReactNode, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

export interface KhyloWizardStep {
    label: string;
    description?: string;
    content: ReactNode;
    /** Return false to prevent advancing to next step */
    canProceed?: () => boolean;
}

interface KhyloWizardProps {
    steps: KhyloWizardStep[];
    onComplete: () => void;
    onCancel?: () => void;
    completeLabel?: string;
}

/**
 * Multi-step wizard component for Khylo admin workflows.
 * Used for library creation, user setup, and configuration flows.
 * NOT a restyled Khylo dialog.
 */
const KhyloWizard: FC<KhyloWizardProps> = ({ steps, onComplete, onCancel, completeLabel = 'Create' }) => {
    const [activeStep, setActiveStep] = useState(0);

    const handleNext = useCallback(() => {
        const step = steps[activeStep];
        if (step.canProceed && !step.canProceed()) return;
        if (activeStep === steps.length - 1) {
            onComplete();
        } else {
            setActiveStep(s => s + 1);
        }
    }, [activeStep, steps, onComplete]);

    const handleBack = useCallback(() => {
        setActiveStep(s => Math.max(0, s - 1));
    }, []);

    const isLastStep = activeStep === steps.length - 1;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 480 }}>
            {/* Step indicators */}
            <Stepper
                activeStep={activeStep}
                sx={{
                    px: 3,
                    py: 2.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '& .MuiStepLabel-label': { fontSize: '0.8rem' },
                    '& .MuiStepIcon-root.Mui-active': { color: '#D97732' },
                    '& .MuiStepIcon-root.Mui-completed': { color: '#3F7D58' }
                }}
            >
                {steps.map((step) => (
                    <Step key={step.label}>
                        <StepLabel>{step.label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* Step content */}
            <Box sx={{ flexGrow: 1, px: 3, py: 3 }}>
                {steps[activeStep]?.description && (
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 2.5 }}>
                        {steps[activeStep].description}
                    </Typography>
                )}
                {steps[activeStep]?.content}
            </Box>

            {/* Navigation */}
            <Divider />
            <Stack
                direction='row'
                justifyContent='space-between'
                sx={{ px: 3, py: 2 }}
            >
                <Stack direction='row' gap={1}>
                    {onCancel && (
                        <Button variant='text' onClick={onCancel} sx={{ textTransform: 'none' }}>
                            Cancel
                        </Button>
                    )}
                    <Button
                        variant='outlined'
                        onClick={handleBack}
                        disabled={activeStep === 0}
                        sx={{ textTransform: 'none' }}
                    >
                        Back
                    </Button>
                </Stack>
                <Button
                    variant='contained'
                    onClick={handleNext}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        backgroundColor: '#D97732',
                        '&:hover': { backgroundColor: '#c4692a' }
                    }}
                >
                    {isLastStep ? completeLabel : 'Continue'}
                </Button>
            </Stack>
        </Box>
    );
};

export default KhyloWizard;
