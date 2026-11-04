import React, { FunctionComponent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import globalize from 'lib/globalize';

type IProps = {
    open: boolean
    bytesSoFar?: number
};

const sizeText = (bytes: number) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`);

const BackupProgressDialog: FunctionComponent<IProps> = ({ open, bytesSoFar }) => {
    return (
        <Dialog
            open={open}
            maxWidth={'xs'}
            fullWidth
        >
            <DialogTitle>{globalize.translate('MessageBackupInProgress')}</DialogTitle>
            <DialogContent>
                <LinearProgress />
                <DialogContentText sx={{ mt: 2 }}>
                    {bytesSoFar ? `${sizeText(bytesSoFar)} saved so far. ` : ''}
                    A backup with artwork and other media details can take several minutes. You can leave this page; it keeps going.
                </DialogContentText>
            </DialogContent>
        </Dialog>
    );
};

export default BackupProgressDialog;
