import React, { Component } from 'react';

import { Grid, Button } from '@mui/material';

import {
    Info as IconInfo,
    Warning as IconWarning,
    Error as IconError,
    Key as IconAuth,
    Send as IconSend,
    Public as IconWeb,
    Search as IconSearch,
    MenuBook as IconMenuBook,
    Help as IconHelp,
    UploadFile as IconUploadFile,
} from '@mui/icons-material';

import type AdminConnection from './wrapper/AdminConnection';

import I18n from './wrapper/i18n';
import Utils from './wrapper/Components/Utils';
import ConfirmDialog from './wrapper/Dialogs/Confirm';
import Icon from './wrapper/Components/Icon';

// because this class is used in adapter-react-v5, do not include here any foreign files like from '../../helpers/utils.ts'
export function isObject(it: any): it is Record<string, any> {
    // This is necessary because:
    // typeof null === 'object'
    // typeof [] === 'object'
    // [] instanceof Object === true
    return Object.prototype.toString.call(it) === '[object Object]'; // this code is 25% faster than below one
    // return it && typeof it === 'object' && !(it instanceof Array);
}

export interface ConfigGenericProps {
    /** Provided props by the specific component */
    schema: Record<string, any>;
    registerOnForceUpdate: any;
    attr: string;
    data: Record<string, any>;
    onChange: (attrOrData: string | Record<string, any>, val?: any, cb?: () => void) => void;
    custom: boolean;
    forceUpdate: (attrs: string[], data: Record<string, any>) => void;
    alive: boolean;
    originalData: Record<string, any>;
    arrayIndex: any;
    globalData: any;
    systemConfig?: Record<string, any>;
    instanceObj: ioBroker.InstanceObject;
    customObj: Record<string, any>;
    socket: AdminConnection;
    changed: boolean;
    adapterName: string;
    instance: number;
    common: Record<string, any>;
    onError: (attr: string, error?: unknown) => void;
    themeType: string;
    commandRunning: any;
    disabled?: boolean;
    classes: Record<string, any>;
}

export interface ConfigGenericState {
    confirmDialog: boolean;
    confirmNewValue: any;
    confirmAttr: any;
    confirmData: any;
    value?: any;
    confirmDepAttr?: any;
    confirmDepNewValue?: any;
}

export default class ConfigGeneric<Props extends ConfigGenericProps = ConfigGenericProps, State extends ConfigGenericState = ConfigGenericState> extends Component<Props, State> {
    static DIFFERENT_VALUE = '__different__';

    static DIFFERENT_LABEL = 'ra___different__';

    static NONE_VALUE = '';

    static NONE_LABEL = 'ra_none';

    private readonly defaultValue: any;

    private isError: any;

    private readonly lang: ioBroker.Languages;

    private defaultSendToDone?: boolean;

    private sendToTimeout?: any;

    private noPlaceRequired: any;

    constructor(props: Props) {
        super(props);

        // @ts-expect-error of course, as we just
        this.state = {
            confirmDialog: false,
            confirmNewValue: null,
            confirmAttr: null,
            confirmData: null,
        } satisfies ConfigGenericState;

        this.isError = {};

        if (props.schema) {
            if (props.custom) {
                this.defaultValue = props.schema.defaultFunc
                    ? this.executeCustom(
                        props.schema.defaultFunc,
                        props.schema.default,
                        props.data,
                        props.instanceObj,
                        props.arrayIndex,
                        props.globalData,
                    )
                    : props.schema.default;
            } else {
                this.defaultValue = props.schema.defaultFunc
                    ? this.execute(
                        props.schema.defaultFunc,
                        props.schema.default,
                        props.data,
                        props.arrayIndex,
                        props.globalData,
                    )
                    : props.schema.default;
            }
        }

        this.lang = I18n.getLanguage();
    }

    componentDidMount() {
        this.props.registerOnForceUpdate && this.props.registerOnForceUpdate(this.props.attr, this.onUpdate);
        const LIKE_SELECT = ['select', 'autocomplete', 'autocompleteSendTo'];
        // init default value
        if (this.defaultValue !== undefined) {
            const value = ConfigGeneric.getValue(this.props.data, this.props.attr);
            if (
                value === undefined ||
                (LIKE_SELECT.includes(this.props.schema.type) && (value === '' || value === null))
            ) {
                setTimeout(() => {
                    if (this.props.custom) {
                        this.props.onChange(this.props.attr, this.defaultValue, () =>
                            setTimeout(() => this.props.forceUpdate([this.props.attr], this.props.data), 100));
                    } else {
                        ConfigGeneric.setValue(this.props.data, this.props.attr, this.defaultValue);
                        this.props.onChange(this.props.data, undefined, () =>
                            this.props.forceUpdate([this.props.attr], this.props.data));
                    }
                }, 100);
            }
        } else if (this.props.schema.defaultSendTo) {
            this.sendTo();
        }
    }

    sendTo() {
        if (this.props.alive) {
            this.defaultSendToDone = true;
            let data = this.props.schema.data;
            if (data === undefined && this.props.schema.jsonData) {
                data = this.getPattern(this.props.schema.jsonData);
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error(`Cannot parse json data: ${data}`);
                }
            } else {
                data = {
                    attr: this.props.attr,
                    value: ConfigGeneric.getValue(this.props.data, this.props.attr),
                };
            }

            if (data === undefined) {
                data = null;
            }

            this.props.socket
                .sendTo(`${this.props.adapterName}.${this.props.instance}`, this.props.schema.defaultSendTo, data)
                .then((value: any) => {
                    if (value !== null && value !== undefined) {
                        if (this.props.custom) {
                            this.props.onChange(this.props.attr, value, () =>
                                this.props.forceUpdate([this.props.attr], this.props.data));
                        } else {
                            ConfigGeneric.setValue(this.props.data, this.props.attr, value);
                            this.props.onChange(this.props.data, undefined, () =>
                                this.props.forceUpdate([this.props.attr], this.props.data));
                        }
                    }
                });
        } else {
            this.defaultSendToDone = false;
            // show error, that instance did not start
            this.onError(this.props.attr, I18n.t('ra_Instance %s is not alive', this.props.instance.toString()));
        }
    }

    componentWillUnmount() {
        this.props.registerOnForceUpdate && this.props.registerOnForceUpdate(this.props.attr);
        if (this.sendToTimeout) {
            clearTimeout(this.sendToTimeout);
            this.sendToTimeout = null;
        }
    }

    onUpdate = (data: Record<string, any>) => {
        const value = ConfigGeneric.getValue(data || this.props.data, this.props.attr) || '';
        if (this.state.value !== value) {
            this.setState({ value });
        } else {
            this.forceUpdate();
        }
    };

    /**
     * Extract attribute out of data
     *
     * @param data
     * @param attr
     */
    static getValue(data: Record<string, any>, attr: string | string[]): any {
        if (typeof attr === 'string') {
            return ConfigGeneric.getValue(data, attr.split('.'));
        }
        if (attr.length === 1) {
            return data[attr[0]];
        }
        const part = attr.shift();

        if (typeof part === 'string' && typeof data[part] === 'object') {
            return ConfigGeneric.getValue(data[part], attr);
        }
        return null;
    }

    static setValue(data: Record<string, any>, attr: string | string[], value: any) {
        if (typeof attr === 'string') {
            ConfigGeneric.setValue(data, attr.split('.'), value);
            return;
        }
        if (attr.length === 1) {
            if (value === null) {
                delete data[attr[0]];
            } else {
                data[attr[0]] = value;
            }
        } else {
            const part = attr.shift();

            if (typeof part !== 'string') {
                return;
            }

            if (!data[part] || typeof data[part] === 'object') {
                data[part] = data[part] || {};
            }
            ConfigGeneric.setValue(data[part], attr, value);
        }
    }

    getText(text: unknown, noTranslation?: boolean): string {
        if (!text) {
            return '';
        }

        if (typeof text === 'string') {
            const strText = noTranslation ? text : I18n.t(text);
            if (strText.includes('${')) {
                return this.getPattern(strText);
            }
            return strText;
        }

        if (isObject(text)) {
            if (text.func) {
                // calculate pattern
                if (typeof text.func === 'object') {
                    return this.getPattern(text.func[this.lang] || text.func.en || '');
                }
                return this.getPattern(text.func);
            }

            return text[this.lang] || text.en || '';
        }

        return (text as any).toString();
    }

    renderConfirmDialog() {
        if (!this.state.confirmDialog) {
            return null;
        }
        const confirm = this.state.confirmData || this.props.schema.confirm;
        let icon: null | React.JSX.Element = null;
        if (confirm.type === 'warning') {
            icon = <IconWarning />;
        } else if (confirm.type === 'error') {
            icon = <IconError />;
        } else if (confirm.type === 'info') {
            icon = <IconInfo />;
        }

        return (
            <ConfirmDialog
                title={this.getText(confirm.title) || I18n.t('ra_Please confirm')}
                text={this.getText(confirm.text)}
                ok={this.getText(confirm.ok) || I18n.t('ra_Ok')}
                cancel={this.getText(confirm.cancel) || I18n.t('ra_Cancel')}
                icon={icon}
                onClose={isOk =>
                    this.setState({ confirmDialog: false }, () => {
                        if (isOk) {
                            const data = JSON.parse(JSON.stringify(this.props.data));
                            if (this.state.confirmDepAttr) {
                                ConfigGeneric.setValue(data, this.state.confirmDepAttr, this.state.confirmDepNewValue);
                            }

                            ConfigGeneric.setValue(data, this.state.confirmAttr, this.state.confirmNewValue);
                            this.setState(
                                {
                                    confirmDialog: false,
                                    confirmDepAttr: null,
                                    confirmDepNewValue: null,
                                    confirmNewValue: null,
                                    confirmAttr: null,
                                    confirmData: null,
                                },
                                () => this.props.onChange(data),
                            );
                        } else {
                            this.setState({
                                confirmDialog: false,
                                confirmDepAttr: null,
                                confirmDepNewValue: null,
                                confirmNewValue: null,
                                confirmAttr: null,
                                confirmData: null,
                            });
                        }
                    })}
            />
        );
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    getIcon(iconSettings?: string | null): React.JSX.Element | null {
        iconSettings = iconSettings || this.props.schema.icon;
        let icon = null;
        if (iconSettings === 'auth') {
            icon = <IconAuth />;
        } else if (iconSettings === 'send') {
            icon = <IconSend />;
        } else if (iconSettings === 'web') {
            icon = <IconWeb />;
        } else if (iconSettings === 'warning') {
            icon = <IconWarning />;
        } else if (iconSettings === 'error') {
            icon = <IconError />;
        } else if (iconSettings === 'info') {
            icon = <IconInfo />;
        } else if (iconSettings === 'search') {
            icon = <IconSearch />;
        }  else if (iconSettings === 'book') {
            icon = <IconMenuBook />;
        } else if (iconSettings === 'help') {
            icon = <IconHelp />;
        } else if (iconSettings === 'upload') {
            icon = <IconUploadFile />;
        } else if (iconSettings) {
            if (iconSettings.endsWith('.png') || iconSettings.endsWith('.svg') || iconSettings.endsWith('.jpg')) {
                // this path is relative to ./adapter/NAME
                if (!iconSettings.startsWith('http://') && !iconSettings.startsWith('https://')) {
                    iconSettings = `./adapter/${this.props.adapterName}/${iconSettings}`;
                }
            }

            icon = <Icon src={iconSettings} style={{ width: 22, height: 22 }} />;
        }

        return icon;
    }

    /**
     * Trigger onChange, to activate save button on change
     *
     * @param attr the changed attribute
     * @param newValue new value of the attribute
     */
    onChangeAsync(attr: string, newValue: unknown): Promise<void> {
        return new Promise(resolve => this.onChange(attr, newValue, resolve));
    }

    /**
     * Trigger onChange, to activate save button on change
     *
     * @param attr the changed attribute
     * @param newValue new value of the attribute
     * @param cb optional callback function, else returns a Promise
     */
    // eslint-disable-next-line react/no-unused-class-component-methods
    onChange(attr: string, newValue: unknown, cb?: () => void): Promise<void> {
        const data = JSON.parse(JSON.stringify(this.props.data));
        ConfigGeneric.setValue(data, attr, newValue);

        if (
            this.props.schema.confirm &&
            this.execute(this.props.schema.confirm.condition, false, data, this.props.arrayIndex, this.props.globalData)
        ) {
            return new Promise<void>(resolve => {
                this.setState(
                    {
                        confirmDialog: true,
                        confirmNewValue: newValue,
                        confirmAttr: attr,
                        confirmData: null,
                    },
                    () => {
                        if (typeof cb === 'function') {
                            cb();
                        } else {
                            resolve();
                        }
                    },
                );
            });
        }
        // find any inputs with confirmation
        if (this.props.schema.confirmDependsOn) {
            for (let z = 0; z < this.props.schema.confirmDependsOn.length; z++) {
                const dep = this.props.schema.confirmDependsOn[z];
                if (dep.confirm) {
                    const val = ConfigGeneric.getValue(data, dep.attr);

                    if (
                        this.execute(
                            dep.confirm.condition,
                            false,
                            data,
                            this.props.arrayIndex,
                            this.props.globalData,
                        )
                    ) {
                        return new Promise<void>(resolve => {
                            this.setState(
                                {
                                    confirmDialog: true,
                                    confirmNewValue: newValue,
                                    confirmAttr: attr,
                                    confirmDepNewValue: val,
                                    confirmDepAttr: dep.attr,
                                    confirmData: dep.confirm,
                                },
                                () => {
                                    if (typeof cb === 'function') {
                                        cb();
                                    } else {
                                        resolve();
                                    }
                                },
                            );
                        });
                    }
                }
            }
        }

        const changed: string[] = [];
        if (this.props.schema.onChangeDependsOn) {
            for (let z = 0; z < this.props.schema.onChangeDependsOn.length; z++) {
                const dep = this.props.schema.onChangeDependsOn[z];
                if (dep.onChange) {
                    const val = ConfigGeneric.getValue(data, dep.attr);

                    let _newValue;
                    if (this.props.custom) {
                        _newValue = this.executeCustom(
                            dep.onChange.calculateFunc,
                            data,
                            this.props.customObj,
                            this.props.instanceObj,
                            this.props.arrayIndex,
                            this.props.globalData,
                        );
                    } else {
                        _newValue = this.execute(
                            dep.onChange.calculateFunc,
                            val,
                            data,
                            this.props.arrayIndex,
                            this.props.globalData,
                        );
                    }

                    if (_newValue !== val) {
                        ConfigGeneric.setValue(data, dep.attr, _newValue);
                        changed.push(dep.attr);
                    }
                }
            }
        }

        if (this.props.schema.hiddenDependsOn) {
            for (let z = 0; z < this.props.schema.hiddenDependsOn.length; z++) {
                const dep = this.props.schema.hiddenDependsOn[z];
                dep.hidden && changed.push(dep.attr);
            }
        }

        if (this.props.schema.labelDependsOn) {
            for (let z = 0; z < this.props.schema.labelDependsOn.length; z++) {
                const dep = this.props.schema.labelDependsOn[z];
                dep.hidden && changed.push(dep.attr);
            }
        }

        if (this.props.schema.helpDependsOn) {
            for (let z = 0; z < this.props.schema.helpDependsOn.length; z++) {
                const dep = this.props.schema.helpDependsOn[z];
                dep.hidden && changed.push(dep.attr);
            }
        }

        if (this.props.schema.onChange && !this.props.schema.onChange.ignoreOwnChanges) {
            const val = ConfigGeneric.getValue(data, this.props.attr);

            const newValue_ = this.props.custom
                ? this.executeCustom(
                    this.props.schema.onChange.calculateFunc,
                    data,
                    this.props.customObj,
                    this.props.instanceObj,
                    this.props.arrayIndex,
                    this.props.globalData,
                )
                : this.execute(
                    this.props.schema.onChange.calculateFunc,
                    val,
                    data,
                    this.props.arrayIndex,
                    this.props.globalData,
                );
            if (newValue_ !== val) {
                ConfigGeneric.setValue(data, this.props.attr, newValue_);
            }
        }

        if (this.props.custom) {
            this.props.onChange(attr, newValue, () => cb && cb());

            changed &&
                    changed.length &&
                    changed.forEach((_attr, i) =>
                        setTimeout(() => this.props.onChange(_attr, ConfigGeneric.getValue(data, _attr)), i * 50));
        } else {
            this.props.onChange(data, undefined, () => {
                changed.length && this.props.forceUpdate(changed, data);
                cb && cb();
            });
        }

        return Promise.resolve();
    }

    execute(func: string | Record<string, string>, defaultValue: any, data: Record<string, any>, arrayIndex: number, globalData: Record<string, any>) {
        let fun: string;

        if (isObject(func)) {
            fun = func.func;
        } else {
            fun = func;
        }

        if (!fun) {
            return defaultValue;
        }
        try {
            // eslint-disable-next-line no-new-func
            const f = new Function(
                'data',
                'originalData',
                '_system',
                '_alive',
                '_common',
                '_socket',
                '_instance',
                'arrayIndex',
                'globalData',
                '_changed',
                fun.includes('return') ? fun : `return ${fun}`,
            );
            return f(
                data || this.props.data,
                this.props.originalData,
                this.props.systemConfig,
                this.props.alive,
                this.props.common,
                this.props.socket,
                this.props.instance,
                arrayIndex,
                globalData,
                this.props.changed,
            );
        } catch (e) {
            console.error(`Cannot execute ${func}: ${e}`);
            return defaultValue;
        }
    }

    executeCustom(func: string | Record<string, string>, data: Record<string, any>, customObj: Record<string, any>, instanceObj: ioBroker.InstanceObject, arrayIndex: number, globalData: Record<string, any>) {
        let fun: string;

        if (isObject(func)) {
            fun = func.func;
        } else {
            fun = func;
        }

        if (!fun) {
            return null;
        }
        try {
            // eslint-disable-next-line no-new-func
            const f = new Function(
                'data',
                'originalData',
                '_system',
                'instanceObj',
                'customObj',
                '_socket',
                'arrayIndex',
                'globalData',
                '_changed',
                fun.includes('return') ? fun : `return ${fun}`,
            );
            return f(
                data || this.props.data,
                this.props.originalData,
                this.props.systemConfig,
                instanceObj,
                customObj,
                this.props.socket,
                arrayIndex,
                globalData,
                this.props.changed,
            );
        } catch (e) {
            console.error(`Cannot execute ${fun}: ${e}`);
            return null;
        }
    }

    calculate(schema: Record<string, any>) {
        let error;
        let disabled;
        let hidden;
        let defaultValue;

        if (this.props.custom) {
            error = schema.validator
                ? !this.executeCustom(
                    schema.validator,
                    this.props.data,
                    this.props.customObj,
                    this.props.instanceObj,
                    this.props.arrayIndex,
                    this.props.globalData,
                )
                : false;
            disabled = schema.disabled
                ? this.executeCustom(
                    schema.disabled,
                    this.props.data,
                    this.props.customObj,
                    this.props.instanceObj,
                    this.props.arrayIndex,
                    this.props.globalData,
                )
                : false;
            hidden = schema.hidden
                ? this.executeCustom(
                    schema.hidden,
                    this.props.data,
                    this.props.customObj,
                    this.props.instanceObj,
                    this.props.arrayIndex,
                    this.props.globalData,
                )
                : false;
            defaultValue = schema.defaultFunc
                ? this.executeCustom(
                    schema.defaultFunc,
                    this.props.data,
                    this.props.customObj,
                    this.props.instanceObj,
                    this.props.arrayIndex,
                    this.props.globalData,
                )
                : schema.default;
        } else {
            error = schema.validator
                ? !this.execute(schema.validator, false, this.props.data, this.props.arrayIndex, this.props.globalData)
                : false;
            disabled = schema.disabled
                ? this.execute(schema.disabled, false, this.props.data, this.props.arrayIndex, this.props.globalData)
                : false;
            hidden = schema.hidden
                ? this.execute(schema.hidden, false, this.props.data, this.props.arrayIndex, this.props.globalData)
                : false;
            defaultValue = schema.defaultFunc
                ? this.execute(
                    schema.defaultFunc,
                    schema.default,
                    this.props.data,
                    this.props.arrayIndex,
                    this.props.globalData,
                )
                : schema.default;
        }

        return {
            error, disabled, hidden, defaultValue,
        };
    }

    onError(attr: string, error?: unknown) {
        if (!error) {
            delete this.isError[attr];
        } else {
            this.isError[attr] = error;
        }

        this.props.onError && this.props.onError(attr, error);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    renderItem(_error: unknown, _disabled: boolean, _defaultValue?: unknown): React.JSX.Element | string | null {
        return this.getText(this.props.schema.label) || this.getText(this.props.schema.text);
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderHelp(text: string, link: string, noTranslation: boolean) {
        if (!link) {
            text = this.getText(text, noTranslation) || '';
            if (
                text &&
                (text.includes('<a ') || text.includes('<br') || text.includes('<b>') || text.includes('<i>'))
            ) {
                return Utils.renderTextWithA(text);
            }
            return text;
        }
        return <a
            href={link}
            target="_blank"
            rel="noreferrer"
            style={{
                color: this.props.themeType === 'dark' ? '#a147ff' : '#5b238f',
                textDecoration: 'underline',
            }}
        >
            {this.getText(text, noTranslation)}
        </a>;
    }

    getPattern(pattern: any, data?: any) {
        data = data || this.props.data;
        if (!pattern) {
            return '';
        }
        if (typeof pattern === 'object') {
            if (pattern.func) {
                pattern = pattern.func;
            } else {
                console.log(`Object must be stringified: ${JSON.stringify(pattern)}`);
                pattern = JSON.stringify(pattern);
            }
        }

        try {
            if (this.props.custom) {
                // eslint-disable-next-line no-new-func
                const f = new Function(
                    'data',
                    'originalData',
                    'arrayIndex',
                    'globalData',
                    '_system',
                    'instanceObj',
                    'customObj',
                    '_socket',
                    '_changed',
                    `return \`${pattern.replace(/`/g, '\\`')}\``,
                );
                return f(
                    data,
                    this.props.originalData,
                    this.props.arrayIndex,
                    this.props.globalData,
                    this.props.systemConfig,
                    this.props.instanceObj,
                    this.props.customObj,
                    this.props.socket,
                    this.props.changed,
                );
            }
            // eslint-disable-next-line no-new-func
            const f = new Function(
                'data',
                'originalData',
                'arrayIndex',
                'globalData',
                '_system',
                '_alive',
                '_common',
                '_socket',
                '_changed',
                `return \`${pattern.replace(/`/g, '\\`')}\``,
            );
            return f(
                data,
                this.props.originalData,
                this.props.arrayIndex,
                this.props.globalData,
                this.props.systemConfig,
                this.props.alive,
                this.props.common,
                this.props.socket,
                this.props.changed,
            );
        } catch (e) {
            console.error(`Cannot execute ${pattern}: ${e}`);
            return pattern;
        }
    }

    render(): string | React.JSX.Element | null {
        const schema = this.props.schema;

        if (!schema) {
            return null;
        }

        if (this.props.alive && this.defaultSendToDone === false) {
            this.sendToTimeout = setTimeout(() => {
                this.sendToTimeout = null;
                this.sendTo();
            }, 200);
        }

        const {
            error, disabled, hidden, defaultValue,
        } = this.calculate(schema);

        if (hidden) {
            // Remove all errors if element is hidden
            if (Object.keys(this.isError).length) {
                setTimeout(
                    isError => Object.keys(isError).forEach(attr => this.props.onError(attr)),
                    100,
                    JSON.parse(JSON.stringify(this.isError)),
                );
                this.isError = {};
            }

            if (schema.hideOnlyControl) {
                const item = <Grid
                    item
                    xs={schema.xs || undefined}
                    lg={schema.lg || undefined}
                    md={schema.md || undefined}
                    sm={schema.sm || undefined}
                    style={({
                        marginBottom: 0, /* marginRight: 8, */
                        textAlign: 'left',
                        ...schema.style,
                        ...(this.props.themeType === 'dark' ? schema.darkStyle : {}),
                    })}
                />;

                if (schema.newLine) {
                    return <>
                        <div style={{ flexBasis: '100%', height: 0 }} />
                        {item}
                    </>;
                }
                return item;
            }
            return null;
        }
        // Add error
        if (schema.validatorNoSaveOnError) {
            if (error && !Object.keys(this.isError).length) {
                this.isError = {
                    [this.props.attr]: schema.validatorErrorText ? I18n.t(schema.validatorErrorText) : true,
                };
                setTimeout(
                    isError => Object.keys(isError).forEach(attr => this.props.onError(attr, isError[attr])),
                    100,
                    JSON.parse(JSON.stringify(this.isError)),
                );
            } else if (!error && Object.keys(this.isError).length) {
                setTimeout(
                    isError => Object.keys(isError).forEach(attr => this.props.onError(attr)),
                    100,
                    JSON.parse(JSON.stringify(this.isError)),
                );
                this.isError = {};
            }
        }

        const renderedItem = this.renderItem(
            error,
            disabled || this.props.commandRunning || this.props.disabled,
            defaultValue,
        );

        if (this.noPlaceRequired) {
            return renderedItem;
        }

        const item = <Grid
            item
            title={this.getText(schema.tooltip)}
            xs={schema.xs || undefined}
            lg={schema.lg || undefined}
            md={schema.md || undefined}
            sm={schema.sm || undefined}
            style={({
                marginBottom: 0,
                // marginRight: 8,
                textAlign: 'left',
                width: schema.type === 'divider' || schema.type === 'header'
                    ? schema.width || '100%'
                    : undefined,
                ...schema.style,
                ...(this.props.themeType === 'dark' ? schema.darkStyle : {}),
            })}
        >
            {this.props.schema.defaultSendTo && this.props.schema.button ?
                <Grid container style={{ width: '100%' }}>
                    <Grid item flex={1}>
                        {renderedItem}
                    </Grid>
                    <Grid item>
                        <Button
                            variant="outlined"
                            onClick={() => this.sendTo()}
                            title={
                                this.props.schema.buttonTooltip
                                    ? this.getText(
                                        this.props.schema.buttonTooltip,
                                        this.props.schema.buttonTooltipNoTranslation,
                                    )
                                    : I18n.t('ra_Request data by instance')
                            }
                        >
                            {this.getText(this.props.schema.button)}
                        </Button>
                    </Grid>
                </Grid> : renderedItem}
        </Grid>;

        if (schema.newLine) {
            return <>
                <div style={{ flexBasis: '100%', height: 0 }} />
                {this.renderConfirmDialog()}
                {item}
            </>;
        }
        if (this.state.confirmDialog) {
            return <>
                {this.renderConfirmDialog()}
                {item}
            </>;
        }
        return item;
    }
}
