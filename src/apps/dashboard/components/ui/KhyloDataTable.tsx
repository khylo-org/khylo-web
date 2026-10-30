import React, { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { KHYLO_COLORS } from './tokens';

export interface ColumnDef<T> {
    id: string;
    header: string;
    width?: string | number;
    align?: 'left' | 'center' | 'right';
    render: (item: T) => ReactNode;
}

interface KhyloDataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    searchTerm?: string;
    onSearchChange?: (val: string) => void;
    searchPlaceholder?: string;
    toolbarActions?: ReactNode;
    emptyMessage?: string;
    isLoading?: boolean;
}

/**
 * Standard Khylo Data Table.
 * Dense, technical, readable presentation for resources, logs, users, and tasks.
 */
export function KhyloDataTable<T>({
    columns,
    data,
    keyExtractor,
    searchTerm,
    onSearchChange,
    searchPlaceholder = 'Search…',
    toolbarActions,
    emptyMessage = 'No records found',
    isLoading = false
}: KhyloDataTableProps<T>) {
    return (
        <Paper
            variant='outlined'
            sx={{
                borderRadius: '8px',
                borderColor: KHYLO_COLORS.borderDefault,
                bgcolor: KHYLO_COLORS.surfacePrimary,
                overflow: 'hidden'
            }}
        >
            {(onSearchChange || toolbarActions) && (
                <Box
                    sx={{
                        px: 2.5,
                        py: 1.5,
                        borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        flexWrap: 'wrap'
                    }}
                >
                    {onSearchChange && (
                        <TextField
                            size='small'
                            value={searchTerm || ''}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position='start'>
                                        <SearchIcon sx={{ fontSize: 16, color: KHYLO_COLORS.textMuted }} />
                                    </InputAdornment>
                                ),
                                sx: {
                                    fontSize: '0.82rem',
                                    bgcolor: KHYLO_COLORS.surfaceSecondary,
                                    '& fieldset': {
                                        borderColor: KHYLO_COLORS.borderSubtle
                                    },
                                    '&:hover fieldset': {
                                        borderColor: KHYLO_COLORS.borderDefault
                                    }
                                }
                            }}
                            sx={{ width: { xs: '100%', sm: 260 } }}
                        />
                    )}
                    {toolbarActions && <Box>{toolbarActions}</Box>}
                </Box>
            )}

            <TableContainer>
                <Table size='small'>
                    <TableHead>
                        <TableRow sx={{ bgcolor: KHYLO_COLORS.surfaceSecondary }}>
                            {columns.map((col) => (
                                <TableCell
                                    key={col.id}
                                    align={col.align || 'left'}
                                    sx={{
                                        color: KHYLO_COLORS.textMuted,
                                        fontWeight: 700,
                                        fontSize: '0.72rem',
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        borderBottom: `1px solid ${KHYLO_COLORS.borderDefault}`,
                                        py: 1.25,
                                        px: 2,
                                        width: col.width
                                    }}
                                >
                                    {col.header}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} sx={{ textAlign: 'center', py: 5 }}>
                                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textMuted }}>
                                        Loading…
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} sx={{ textAlign: 'center', py: 5 }}>
                                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textMuted }}>
                                        {emptyMessage}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow
                                    key={keyExtractor(item)}
                                    sx={{
                                        '&:hover': {
                                            bgcolor: KHYLO_COLORS.surfaceHover
                                        },
                                        '& td': {
                                            borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                            py: 1.25,
                                            px: 2
                                        }
                                    }}
                                >
                                    {columns.map((col) => (
                                        <TableCell key={col.id} align={col.align || 'left'}>
                                            {col.render(item)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}

export default KhyloDataTable;
