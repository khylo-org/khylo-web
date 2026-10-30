import React, { type FC } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import { KHYLO_COLORS } from './tokens';

export interface KhyloTabItem {
    id: string;
    label: string;
    count?: number;
}

interface KhyloTabsProps {
    tabs: KhyloTabItem[];
    activeTab: string;
    onChange: (tabId: string) => void;
}

/**
 * Modern, low-profile horizontal tab bar for workspace sub-views.
 */
export const KhyloTabs: FC<KhyloTabsProps> = ({ tabs, activeTab, onChange }) => {
    return (
        <Box
            sx={{
                borderBottom: `1px solid ${KHYLO_COLORS.borderDefault}`,
                mb: 3
            }}
        >
            <Tabs
                value={activeTab}
                onChange={(_, val) => onChange(val)}
                sx={{
                    minHeight: 40,
                    '& .MuiTabs-indicator': {
                        backgroundColor: KHYLO_COLORS.accent,
                        height: 2
                    }
                }}
            >
                {tabs.map((tab) => (
                    <Tab
                        key={tab.id}
                        value={tab.id}
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <Chip
                                        label={tab.count}
                                        size='small'
                                        sx={{
                                            height: 18,
                                            fontSize: '0.68rem',
                                            fontWeight: 600,
                                            bgcolor: activeTab === tab.id ? KHYLO_COLORS.accentMuted : KHYLO_COLORS.surfaceSecondary,
                                            color: activeTab === tab.id ? KHYLO_COLORS.accent : KHYLO_COLORS.textMuted
                                        }}
                                    />
                                )}
                            </Box>
                        }
                        sx={{
                            minHeight: 40,
                            py: 1,
                            px: 2,
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: activeTab === tab.id ? 600 : 500,
                            color: activeTab === tab.id ? KHYLO_COLORS.textPrimary : KHYLO_COLORS.textSecondary,
                            '&:hover': {
                                color: KHYLO_COLORS.textPrimary
                            }
                        }}
                    />
                ))}
            </Tabs>
        </Box>
    );
};

export default KhyloTabs;
