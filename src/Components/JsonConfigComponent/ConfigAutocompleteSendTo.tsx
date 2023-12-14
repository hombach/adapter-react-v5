import React from 'react';
import { withStyles } from '@mui/styles';

import { Autocomplete, TextField } from '@mui/material';

import I18n from './wrapper/i18n';

import ConfigGeneric from './ConfigGeneric';
import type { ConfigAutocompleteProps, ConfigAutocompleteSchema, ConfigAutocompleteState } from './ConfigAutocomplete';

interface ConfigAutocompleteSendToState extends ConfigAutocompleteState {
    context: string;
}

interface ConfigAutocompleteSendToSchema extends ConfigAutocompleteSchema {
    /** Data to send to adapter as json */
    jsonData: Record<string, any>;
    /** Command to send to adapter */
    command: string;
    /** String data to send to instance */
    data?: string | null;
    /** Resend command if one of the listed attributes change */
    alsoDependsOn: boolean;
}

interface ConfigAutocompleteSendToProps extends ConfigAutocompleteProps {
    schema: ConfigAutocompleteSendToSchema;
}

const styles = () => ({
    fullWidth: {
        width: '100%',
    },
});

class ConfigAutocompleteSendTo extends ConfigGeneric<ConfigAutocompleteSendToProps, ConfigAutocompleteSendToState> {
    componentDidMount() {
        super.componentDidMount();

        this.askInstance();
    }

    askInstance() {
        const value = ConfigGeneric.getValue(this.props.data, this.props.attr);
        const selectOptions = this.props.schema.options ?
            this.props.schema.options.map((item: any) => (typeof item === 'string' ? { label: item, value: item } : JSON.parse(JSON.stringify(item))))
            :
            [];

        if (this.props.alive) {
            let data = this.props.schema.data;
            if (data === undefined && this.props.schema.jsonData) {
                data = this.getPattern(this.props.schema.jsonData);
                try {
                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }
                } catch (e) {
                    console.error(`Cannot parse json data: ${data}`);
                }
            }

            if (data === undefined) {
                data = null;
            }

            this.props.socket.sendTo(`${this.props.adapterName}.${this.props.instance}`, this.props.schema.command || 'send', data)
                .then((list: unknown) => {
                    if (list && Array.isArray(list)) {
                        list.forEach(item =>
                            selectOptions.push(typeof item === 'string' ? { label: item, value: item } : JSON.parse(JSON.stringify(item))));
                    }

                    // if __different
                    if (Array.isArray(value)) {
                        selectOptions.unshift({ label: I18n.t(ConfigGeneric.DIFFERENT_LABEL), value: ConfigGeneric.DIFFERENT_VALUE });
                        this.setState({ value: ConfigGeneric.DIFFERENT_VALUE, selectOptions, context: this.getContext() });
                    } else {
                        this.setState({ value, selectOptions, context: this.getContext() });
                    }
                });
        } else if (Array.isArray(value)) {
            // if __different
            selectOptions.unshift({ label: I18n.t(ConfigGeneric.DIFFERENT_LABEL), value: ConfigGeneric.DIFFERENT_VALUE });
            this.setState({ value: ConfigGeneric.DIFFERENT_VALUE, selectOptions });
        } else {
            this.setState({ value, selectOptions });
        }
    }

    getContext(): string {
        const context: Record<string, any> = {};
        if (Array.isArray(this.props.schema.alsoDependsOn)) {
            this.props.schema.alsoDependsOn.forEach(attr =>
                context[attr] = ConfigGeneric.getValue(this.props.data, attr));
        }
        return JSON.stringify(context);
    }

    renderItem(error: unknown, disabled: boolean): React.JSX.Element | null {
        if (!this.state.selectOptions) {
            return null;
        }

        if (this.props.alive) {
            const context = this.getContext();
            if (context !== this.state.context) {
                setTimeout(() => this.askInstance(), 300);
            }
        }

        let item;
        const options = JSON.parse(JSON.stringify(this.state.selectOptions));
        const isIndeterminate = Array.isArray(this.state.value) || this.state.value === ConfigGeneric.DIFFERENT_LABEL;

        if (isIndeterminate) {
            [...this.state.value]
                .filter(val => !options.find((it: any) => it.value === val))
                .forEach(it => options.push({ label: it.toString(), value: it }));

            item = { label: I18n.t(ConfigGeneric.DIFFERENT_LABEL), value: ConfigGeneric.DIFFERENT_VALUE };
            options.unshift(item);
        } else {
            item = this.state.value !== null && this.state.value !== undefined &&
                // eslint-disable-next-line
                options.find((item: any) => item.value == this.state.value); // let "==" be and not ===

            if (this.state.value !== null && this.state.value !== undefined && !item && this.props.schema.freeSolo) {
                item = { value: this.state.value, label: this.state.value };
                options.push(item);
            }
            item = item || null;
        }

        if (!options.length) {
            return <TextField
                variant="standard"
                fullWidth
                value={this.state.value === null || this.state.value === undefined ? '' : this.state.value}
                error={!!error}
                disabled={disabled}
                inputProps={{ maxLength: this.props.schema.maxLength || this.props.schema.max || undefined }}
                onChange={e => {
                    const value = e.target.value;
                    this.setState({ value }, () =>
                        this.onChange(this.props.attr, (value || '').trim()));
                }}
                placeholder={this.getText(this.props.schema.placeholder)}
                label={this.getText(this.props.schema.label)}
                helperText={this.renderHelp(this.props.schema.help, this.props.schema.helpLink, this.props.schema.noTranslation)}
            />;
        }
        return <Autocomplete
            value={item}
            fullWidth
            freeSolo={!!this.props.schema.freeSolo}
            options={options}
            // autoComplete
            getOptionLabel={option => option?.label ?? ''}
            className={this.props.classes.indeterminate}
            onInputChange={e => {
                if (!e || !this.props.schema.freeSolo) {
                    return;
                }

                const val = (e.target as HTMLInputElement).value;
                if (val !== this.state.value) {
                    this.setState({ value: val }, () => this.onChange(this.props.attr, val));
                }
            }}
            onChange={(_, value) => {
                const val = typeof value === 'object' ? (value ? value.value : '') : value;
                if (val !== this.state.value) {
                    this.setState({ value: val }, () => this.onChange(this.props.attr, val));
                }
            }}
            renderInput={params =>
                <TextField
                    variant="standard"
                    {...params}
                    // inputProps are important and will be given in params
                    // inputProps={{maxLength: this.props.schema.maxLength || this.props.schema.max || undefined}}
                    error={!!error}
                    placeholder={this.getText(this.props.schema.placeholder)}
                    label={this.getText(this.props.schema.label)}
                    helperText={this.renderHelp(this.props.schema.help, this.props.schema.helpLink, this.props.schema.noTranslation)}
                    disabled={disabled}
                />}
        />;
    }
}

export default withStyles(styles)(ConfigAutocompleteSendTo);
