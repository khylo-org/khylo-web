import React, { type FC } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { KHYLO_COLORS } from './tokens';

interface KhyloStickyActionBarProps {
    /** True if the form has unsaved modifications */
    isDirty: boolean;
    /** True if the form is currently submitting */
    isSaving?: boolean;
    /** Callback to save changes */
    onSave: () => void;
    /** Callback to discard changes */
    onDiscard?: () => void;
    /** Alias for onDiscard */
    onReset?: () => void;
    /** Optional save button label */
    saveLabel?: string;
    /** Alias for saveLabel */
    saveText?: string;
    /** Optional message or status text */
    statusMessage?: string;
    /** Keeps the save button off while something else is still needed first. */
    saveDisabled?: boolean;
}

/**
 * Sticky action / save bar for configuration workspaces.
 * Sits at the bottom of the viewport or workspace, giving persistent feedback on save state.
 */
export const KhyloStickyActionBar: FC<KhyloStickyActionBarProps> = ({
    isDirty,
    isSaving = false,
    onSave,
    onDiscard,
    onReset,
    saveLabel = 'Save Changes',
    saveText,
    statusMessage,
    saveDisabled = false
}) => {
    const handleDiscard = onDiscard || onReset;
    const effectiveSaveLabel = saveText || saveLabel || 'Save Changes';

    return (
        <Paper
            elevation={4}
            sx={{
                position: 'sticky',
                bottom: 16,
                zIndex: 100,
                mt: 4,
                px: 3,
                py: 1.5,
                borderRadius: '8px',
                bgcolor: KHYLO_COLORS.surfaceElevated,
                border: `1px solid ${isDirty ? KHYLO_COLORS.accent : KHYLO_COLORS.borderDefault}`,
                boxShadow: isDirty
                    ? '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(217, 119, 50, 0.2)'
                    : '0 8px 24px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                transition: 'all 0.2s ease'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {isDirty ? (
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: KHYLO_COLORS.accent,
                            boxShadow: `0 0 8px ${KHYLO_COLORS.accent}`
                        }}
                    />
                ) : (
                    <CheckCircleOutlineIcon sx={{ fontSize: 16, color: KHYLO_COLORS.status.healthy.fg }} />
                )}
                <Typography
                    variant='body2'
                    sx={{
                        fontWeight: 600,
                        color: isDirty ? KHYLO_COLORS.textPrimary : KHYLO_COLORS.textSecondary,
                        fontSize: '0.85rem'
                    }}
                >
                    {statusMessage || (isDirty ? 'Unsaved changes in workspace' : 'All settings up to date')}
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {handleDiscard && (
                    <Button
                        size='small'
                        variant='text'
                        startIcon={<UndoIcon fontSize='small' />}
                        onClick={handleDiscard}
                        disabled={!isDirty || isSaving}
                        sx={{
                            textTransform: 'none',
                            color: KHYLO_COLORS.textSecondary,
                            fontWeight: 500,
                            fontSize: '0.82rem',
                            '&:hover': {
                                color: KHYLO_COLORS.textPrimary,
                                bgcolor: KHYLO_COLORS.surfaceHover
                            }
                        }}
                    >
                        Discard
                    </Button>
                )}

                <Button
                    size='small'
                    variant='contained'
                    startIcon={isSaving ? <CircularProgress size={14} color='inherit' /> : <SaveIcon fontSize='small' />}
                    onClick={onSave}
                    disabled={!isDirty || isSaving || saveDisabled}
                    sx={{
                        textTransform: 'none',
                        bgcolor: KHYLO_COLORS.accent,
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        px: 2.2,
                        py: 0.6,
                        borderRadius: '6px',
                        boxShadow: 'none',
                        '&:hover': {
                            bgcolor: KHYLO_COLORS.accentHover,
                            boxShadow: '0 2px 8px rgba(217, 119, 50, 0.4)'
                        },
                        '&.Mui-disabled': {
                            bgcolor: 'rgba(255, 255, 255, 0.08)',
                            color: KHYLO_COLORS.textMuted
                        }
                    }}
                >
                    {isSaving ? 'Saving…' : effectiveSaveLabel}
                </Button>
            </Box>
        </Paper>
    );
};

export default KhyloStickyActionBar;
