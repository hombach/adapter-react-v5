import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';

import I18n from '../../i18n';

import ConfigGeneric from './ConfigGeneric';

const styles = theme => ({
    table: {
        minWidth: 400
    },
    header: {
        fontSize: 16,
        fontWeight: 'bold'
    }
});

class ConfigCustomEasyAccess extends ConfigGeneric {
    componentDidMount() {
        super.componentDidMount();

        this.props.socket.getAdapterInstances()
            .then(instances => {
                instances = instances
                    .filter(instance =>
                        instance?.common?.adminUI && (instance.common.adminUI.config !== 'none' || instance.common.adminUI.tab))
                    .map(instance => ({
                        id: instance._id.replace(/^system\.adapter\./, ''),
                        config: instance.common.adminUI.config !== 'none',
                        adminTab: instance.common.adminTab
                    }))
                    .sort((a, b) => a.id > b.id ? 1 : (a.id < b.id ? -1 : 0));

                this.setState({instances});
            });
    }

    renderItem(error, disabled, defaultValue) {
        if (!this.state.instances) {
            return null;
        } else {
            const accessAllowedConfigs = ConfigGeneric.getValue(this.props.data, 'accessAllowedConfigs') || [];
            const accessAllowedTabs    = ConfigGeneric.getValue(this.props.data, 'accessAllowedTabs')    || [];

            return <TableContainer>
                <Table className={this.props.classes.table} size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell className={this.props.classes.header}>{I18n.t('Instance')}</TableCell>
                            <TableCell className={this.props.classes.header}>{I18n.t('Config')}</TableCell>
                            <TableCell className={this.props.classes.header}>{I18n.t('Tab')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {this.state.instances.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell component="th" scope="row">{row.id}</TableCell>
                                <TableCell>
                                    {row.config ?
                                        <Checkbox checked={accessAllowedConfigs.includes(row.id)}
                                            onClick={() => {
                                                const _accessAllowedConfigs = [...accessAllowedConfigs];
                                                const pos = _accessAllowedConfigs.indexOf(row.id);
                                                if (pos !== -1) {
                                                    _accessAllowedConfigs.splice(pos, 1);
                                                } else {
                                                    _accessAllowedConfigs.push(row.id);
                                                    _accessAllowedConfigs.sort();
                                                }
                                                this.onChange('accessAllowedConfigs', _accessAllowedConfigs);
                                            }}
                                        />
                                    : null}</TableCell>
                                <TableCell>
                                    {row.adminTab ?
                                        <Checkbox
                                            checked={accessAllowedTabs.includes(row.id)}
                                             onClick={() => {
                                                 const _accessAllowedTabs = [...accessAllowedTabs];
                                                 const pos = _accessAllowedTabs.indexOf(row.id);
                                                 if (pos !== -1) {
                                                     _accessAllowedTabs.splice(pos, 1);
                                                 } else {
                                                     _accessAllowedTabs.push(row.id);
                                                     _accessAllowedTabs.sort();
                                                 }
                                                 this.onChange('accessAllowedTabs', _accessAllowedTabs);
                                             }}
                                        /> : null}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>;
        }
    }
}

ConfigCustomEasyAccess.propTypes = {
    socket: PropTypes.object.isRequired,
    themeType: PropTypes.string,
    themeName: PropTypes.string,
    style: PropTypes.object,
    className: PropTypes.string,
    data: PropTypes.object.isRequired,
    schema: PropTypes.object,
    onError: PropTypes.func,
    onChange: PropTypes.func,
};

export default withStyles(styles)(ConfigCustomEasyAccess);