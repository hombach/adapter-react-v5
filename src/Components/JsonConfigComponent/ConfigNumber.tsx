import React from 'react';
import { Styles, withStyles } from '@mui/styles';

import { Autocomplete, TextField, FormControl } from '@mui/material';

import type AdminConnection from './wrapper/AdminConnection';
import I18n from './wrapper/i18n';

import ConfigGeneric, { ConfigGenericProps, ConfigGenericState } from './ConfigGeneric';

const styles = () => ({
    indeterminate: {
        opacity: 0.5,
    },
    control: {
        flexDirection: 'row',
        width: '100%',
    },
}) satisfies Styles<any, any>;

interface ConfigNumberProps extends ConfigGenericProps {
    socket: AdminConnection;
    themeType: string;
    themeName: string;
    style: Record<string, any>;
    className: string;
    data: Record<string, any>;
    schema: Record<string, any>;
    onError: () => void;
    onChange: () => void;
    classes: Record<string, any>;
}

interface ConfigNumberState extends ConfigGenericState {
    _value: string;
    oldValue: string | null;
}

class ConfigNumber extends ConfigGeneric<ConfigNumberProps, ConfigNumberState> {
    private updateTimeout?: NodeJS.Timeout;

    componentDidMount() {
        super.componentDidMount();
        let _value = ConfigGeneric.getValue(this.props.data, this.props.attr);
        if (_value === null || _value === undefined) {
            _value = '';
        }
        this.setState({ _value: _value.toString(), oldValue: _value.toString() });
        // this.props.registerOnForceUpdate(this.props.attr, this.onUpdate);
    }

    static getDerivedStateFromProps(props: ConfigNumberProps, state: ConfigNumberState) {
        if (
            (props.schema.min !== undefined && props.schema.min < 0) ||
            (props.schema.max !== undefined && props.schema.max < 0)
        ) {
            return null;
        }
        const _value = ConfigGeneric.getValue(props.data, props.attr);
        if (
            _value === null ||
            _value === undefined ||
            state.oldValue === null ||
            state.oldValue === undefined ||
            (_value.toString() !== parseFloat(state._value).toString() &&
                _value.toString() !== state.oldValue.toString())
        ) {
            return { _value };
        }
        return null;
    }

    checkValue(value: string): string | null {
        if (value === null || value === undefined) {
            return null;
        }
        value = value.toString().trim();
        const f = value === '' ? 0 : parseFloat(value);

        if (value !== '' && Number.isNaN(f)) {
            return 'ra_Not a number';
        }

        // eslint-disable-next-line no-restricted-properties
        if (value !== '' && window.isFinite(f)) {
            if (this.props.schema.min !== undefined && f < this.props.schema.min) {
                return 'ra_Too small';
            }
            if (this.props.schema.max !== undefined && f > this.props.schema.max) {
                return 'ra_Too big';
            }
            if (value === '' || value === '-' || Number.isNaN(f)) {
                return 'ra_Not a number';
            }

            return null;
        }

        return 'ra_Not a number';
    }

    renderItem(error: unknown, disabled: boolean) {
        const isIndeterminate = Array.isArray(this.state.value) || this.state.value === ConfigGeneric.DIFFERENT_VALUE;

        if (this.state.oldValue !== null && this.state.oldValue !== undefined) {
            this.updateTimeout && clearTimeout(this.updateTimeout);
            this.updateTimeout = setTimeout(() => {
                this.updateTimeout = undefined;
                this.setState({ oldValue: null });
            }, 30);
        } else if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = undefined;
        }

        if (isIndeterminate) {
            const arr = [...this.state.value].map(item => ({ label: item.toString(), value: item }));
            arr.unshift({ label: I18n.t(ConfigGeneric.DIFFERENT_LABEL), value: ConfigGeneric.DIFFERENT_VALUE });

            return <Autocomplete
                className={this.props.classes.indeterminate}
                fullWidth
                value={arr[0]}
                // @ts-expect-error needs investigation if this really has no effect
                getOptionSelected={(option, value) => option.label === value.label}
                onChange={(_, value) =>
                    this.onChange(this.props.attr, value?.value)}
                options={arr}
                getOptionLabel={option => option.label}
                renderInput={params => (
                    <TextField
                        variant="standard"
                        {...params}
                        inputProps={{ readOnly: this.props.schema.readOnly || false }}
                        error={!!error}
                        placeholder={this.getText(this.props.schema.placeholder)}
                        label={this.getText(this.props.schema.label)}
                        helperText={this.renderHelp(
                            this.props.schema.help,
                            this.props.schema.helpLink,
                            this.props.schema.noTranslation,
                        )}
                        disabled={!!disabled}
                    />
                )}
            />;
        }
        if (!error && this.state._value !== null && this.state._value !== undefined && this.state._value) {
            error = this.checkValue(this.state._value);
            if (error) {
                error = I18n.t(error as string);
            }
        }

        return <FormControl variant="standard" className={this.props.classes.control}>
            <TextField
                variant="standard"
                type="number"
                fullWidth
                inputProps={{
                    min: this.props.schema.min,
                    max: this.props.schema.max,
                    step: this.props.schema.step,
                    readOnly: this.props.schema.readOnly || false,
                }}
                value={this.state._value === null || this.state._value === undefined ? '' : this.state._value}
                error={!!error}
                disabled={!!disabled}
                onChange={e => {
                    const _value = e.target.value; // value is always a string and it is validly formatted
                    const _error = this.checkValue(_value);
                    if (_error) {
                        this.onError(this.props.attr, I18n.t(_error));
                    } else {
                        this.onError(this.props.attr); // clear error
                    }

                    this.setState({ _value, oldValue: this.state._value }, () =>
                        this.onChange(this.props.attr, parseFloat(_value)));
                }}
                placeholder={this.getText(this.props.schema.placeholder)}
                label={this.getText(this.props.schema.label)}
                helperText={
                    error && typeof error === 'string'
                        ? error
                        : this.renderHelp(
                            this.props.schema.help,
                            this.props.schema.helpLink,
                            this.props.schema.noTranslation,
                        )
                }
            />
        </FormControl>;
    }
}

export default withStyles(styles)(ConfigNumber);
