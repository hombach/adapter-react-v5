import React, { createRef } from 'react';
import PropTypes from 'prop-types';
import { /* lighten, */ withStyles } from '@mui/styles';
import Dropzone from 'react-dropzone';

import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, InputAdornment, Paper,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TableSortLabel,
    TextField, Toolbar, Tooltip,
    Typography,
    FormHelperText,
} from '@mui/material';

import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
    ArrowUpward as UpIcon,
    ArrowDownward as DownIcon,
    FilterAlt as IconFilterOn,
    FilterAltOff as IconFilterOff,
    ContentCopy as CopyContentIcon,
    Download as ExportIcon,
    Warning as ErrorIcon,
    UploadFile as ImportIcon,
    Close as IconClose,
} from '@mui/icons-material';

import I18n from './wrapper/i18n';
import Utils from './wrapper/Components/Utils';

import ConfigGeneric from './ConfigGeneric';
// eslint-disable-next-line import/no-cycle
import ConfigPanel from './ConfigPanel';

const MAX_SIZE = 1024 * 1024; // 1MB

const styles = theme => ({
    fullWidth: {
        width: '100%',
    },
    root: {
        width: '100%',
    },
    paper: {
        width: '100%',
        marginBottom: theme.spacing(2),
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerText: {
        width: '100%',
    },
    table: {
        minWidth: 750,
    },
    visuallyHidden: {
        border: 0,
        clip: 'rect(0 0 0 0)',
        height: 1,
        margin: -1,
        overflow: 'hidden',
        padding: 0,
        position: 'absolute',
        top: 20,
        width: 1,
    },
    label: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    highlight:
        theme.palette.mode === 'light'
            ? {
                color: theme.palette.secondary.main,
                // backgroundColor: lighten(theme.palette.secondary.light, 0.85),
            }
            : {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.secondary.dark,
            },
    title: {
        flex: '1 1 100%',
    },
    rootTool: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(1),
    },
    silver: {
        opacity: 0.2,
    },
    flex: {
        display: 'flex',
        alignItems: 'baseline',
    },
    filteredOut: {
        padding: 10,
        display: 'flex',
        textAlign: 'center',
    },
    buttonEmpty: {
        width: 34,
        display: 'inline-block',
    },
    buttonCell: {
        whiteSpace: 'nowrap',
    },

    dropZone: {
        width: '100%',
        height: 100,
        position: 'relative',
    },
    dropZoneEmpty: {

    },
    uploadDiv: {
        position: 'relative',
        width: '100%',
        height: 300,
        opacity: 0.9,
        marginTop: 30,
        cursor: 'pointer',
        outline: 'none',
    },
    uploadDivDragging: {
        opacity: 1,
        background: 'rgba(128,255,128,0.1)',
    },
    image: {
        objectFit: 'contain',
        margin: 'auto',
        display: 'flex',
        width: '100%',
        height: '100%',
    },
    uploadCenterDiv: {
        margin: 5,
        border: '3px dashed grey',
        borderRadius: 5,
        width: 'calc(100% - 10px)',
        height: 'calc(100% - 10px)',
        minHeight: 300,
        position: 'relative',
        display: 'flex',
    },
    uploadCenterIcon: {
        paddingTop: 10,
        width: 48,
        height: 48,
    },
    uploadCenterText: {
        fontSize: 16,
    },
    uploadCenterTextAndIcon: {
        textAlign: 'center',
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonRemoveWrapper: {
        position: 'absolute',
        zIndex: 222,
        right: 0,
    },
    error: {
        border: '2px solid red',
        boxSizing: 'border-box',
    },
});

function objectToArray(object, nameOfFirstAttr, nameOfSecondAttr) {
    nameOfFirstAttr  = nameOfFirstAttr || 'key';

    const array = [];
    Object.keys(object).forEach(key => {
        const item = {};
        item[nameOfFirstAttr] = key;

        if (nameOfSecondAttr) {
            item[nameOfSecondAttr] = object[key];
            array.push(item);
        } else {
            array.push(Object.assign(item, object[key]));
        }
    });

    return array;
}

function arrayToObject(array, nameOfFirstAttr, nameOfSecondAttr) {
    nameOfFirstAttr  = nameOfFirstAttr  || 'key';

    const object = {};

    array.forEach(row => {
        let key = row[nameOfFirstAttr];
        if (key === null || key === undefined) {
            key = '';
        }
        delete row[nameOfFirstAttr];

        if (nameOfSecondAttr) {
            object[key] = row[nameOfSecondAttr];
        } else {
            object[key] = row;
        }
    });

    return object;
}

class ConfigTable extends ConfigGeneric {
    constructor(props) {
        super(props);
        this.filterRefs = {};
        this.props.schema.items = this.props.schema.items || [];
        this.props.schema.items.forEach(el => {
            if (el.filter) {
                this.filterRefs[el.attr] = createRef();
            }
        });
    }

    /**
     * React lifecycle hook, called once component is mounted
     * @return {Promise<void>}
     */
    async componentDidMount() {
        super.componentDidMount();
        let value = ConfigGeneric.getValue(this.props.data, this.props.attr) || [];

        // if the list is given as an object
        if (this.props.schema.objKeyName) {
            value = objectToArray(value, this.props.schema.objKeyName, this.props.schema.objValueName);
        }

        if (!Array.isArray(value)) {
            value = [];
        }

        this.setState({
            value,
            visibleValue: null,
            orderBy: /* this.props.schema.items.length ? this.props.schema.items[0].attr : */'',
            order: 'asc',
            iteration: 0,
            filterOn: [],
        }, () => this.validateUniqueProps());
    }

    componentWillUnmount() {
        this.typingTimer && clearTimeout(this.typingTimer);
        this.typingTimer = null;
        super.componentWillUnmount();
    }

    itemTable(attrItem, data, idx) {
        const { value } = this.state;
        const { schema } = this.props;
        const schemaForAttribute = schema.items && schema.items.find(el => el.attr === attrItem);

        if (!schemaForAttribute) {
            return null;
        }

        const schemaItem = {
            items: {
                [attrItem]: schemaForAttribute,
            },
        };

        return <ConfigPanel
            index={idx + this.state.iteration}
            arrayIndex={idx}
            changed={this.props.changed}
            globalData={this.props.data}
            socket={this.props.socket}
            adapterName={this.props.adapterName}
            instance={this.props.instance}
            common={this.props.common}
            alive={this.props.alive}
            themeType={this.props.themeType}
            themeName={this.props.themeName}
            data={data}
            table
            custom
            schema={schemaItem}
            systemConfig={this.props.systemConfig}
            originalData={this.props.originalData}
            customs={this.props.customs}
            onChange={(attr, valueChange) => {
                const newObj = JSON.parse(JSON.stringify(value));
                newObj[idx][attr] = valueChange;
                this.setState({ value: newObj }, () => {
                    this.validateUniqueProps();
                    this.onChangeWrapper(newObj, true);
                });
            }}
            onError={(error, attr) => this.onError(error, attr)}
        />;
    }

    /**
     * Validate that columns configured in `uniqueColumns` have unique values
     */
    validateUniqueProps() {
        if (!this.props.schema.uniqueColumns) {
            return;
        }

        for (const uniqueCol of this.props.schema.uniqueColumns) {
            /** @type {string[]} */
            const allVals = [];
            const found = this.state.value.find(entry => {
                const val = entry[uniqueCol];
                if (allVals.includes(val)) {
                    this.onError(uniqueCol, 'is not unique');
                    this.setState({ errorMessage: I18n.t('Non-allowed duplicate entry "%s" in column "%s"', val, uniqueCol) });
                    return true;
                }
                allVals.push(val);
                return false;
            });

            if (!found) {
                this.onError(uniqueCol, null);
                this.setState({ errorMessage: '' });
            }
        }
    }

    static descendingComparator(a, b, orderBy) {
        if (b[orderBy] < a[orderBy]) {
            return -1;
        }
        if (b[orderBy] > a[orderBy]) {
            return 1;
        }
        return 0;
    }

    static getComparator(order, orderBy) {
        return order === 'desc'
            ? (a, b) =>  ConfigTable.descendingComparator(a, b, orderBy)
            : (a, b) => -ConfigTable.descendingComparator(a, b, orderBy);
    }

    handleRequestSort = (property, orderCheck = false) => {
        const { order, orderBy } = this.state;
        if (orderBy) {
            const isAsc = orderBy === property && order === 'asc';
            const newOrder = orderCheck ? order : (isAsc ? 'desc' : 'asc');
            const newValue = this.stableSort(newOrder, property);
            this.setState({ order: newOrder, orderBy: property, iteration: this.state.iteration + 10000 }, () =>
                this.applyFilter(false, newValue));
        }
    };

    stableSort = (order, orderBy) => {
        const { value } = this.state;
        const comparator = ConfigTable.getComparator(order, orderBy);
        const stabilizedThis = value.map((el, index) => [el, index]);

        stabilizedThis.sort((a, b) => {
            const order_ = comparator(a[0], b[0]);
            if (order_ !== 0) {
                return order_;
            }
            return a[1] - b[1];
        });

        return stabilizedThis.map(el => el[0]);
    };

    enhancedTableHead(buttonsWidth, doAnyFilterSet) {
        const { schema, classes } = this.props;
        const { order, orderBy } = this.state;
        return <TableHead>
            <TableRow>
                {schema.items && schema.items.map((headCell, i) =>
                    <TableCell
                        style={{ width: typeof headCell.width === 'string' && headCell.width.endsWith('%') ? headCell.width : headCell.width }}
                        key={`${headCell.attr}_${i}`}
                        align="left"
                        sortDirection={orderBy === headCell.attr ? order : false}
                    >
                        <div className={classes.flex} style={schema.showFirstAddOnTop ? { flexDirection: 'column' } : undefined}>
                            {!i && !schema.noDelete ? <Tooltip title={doAnyFilterSet ? I18n.t('ra_Cannot add items with set filter') : I18n.t('ra_Add row')}>
                                <span>
                                    <IconButton size="small" color="primary" disabled={!!doAnyFilterSet && !this.props.schema.allowAddByFilter} onClick={this.onAdd}>
                                        <AddIcon />
                                    </IconButton>
                                </span>
                            </Tooltip> : null}
                            {headCell.sort && <TableSortLabel
                                active
                                className={Utils.clsx(orderBy !== headCell.attr && classes.silver)}
                                direction={orderBy === headCell.attr ? order : 'asc'}
                                onClick={() => this.handleRequestSort(headCell.attr)}
                            />}
                            {headCell.filter && this.state.filterOn.includes(headCell.attr) ?
                                <TextField
                                    variant="standard"
                                    ref={this.filterRefs[headCell.attr]}
                                    onChange={() => this.applyFilter()}
                                    title={I18n.t('ra_You can filter entries by entering here some text')}
                                    InputProps={{
                                        endAdornment: this.filterRefs[headCell.attr]?.current?.children[0]?.children[0]?.value && <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    this.filterRefs[headCell.attr].current.children[0].children[0].value = '';
                                                    this.applyFilter();
                                                }}
                                            >
                                                <CloseIcon />
                                            </IconButton>
                                        </InputAdornment>,
                                    }}
                                    fullWidth
                                    placeholder={this.getText(headCell.title)}
                                />
                                : <span className={this.props.classes.headerText}>{this.getText(headCell.title)}</span>}
                            {headCell.filter ? <IconButton
                                title={I18n.t('ra_Show/hide filter input')}
                                size="small"
                                onClick={() => {
                                    const filterOn = [...this.state.filterOn];
                                    const pos = this.state.filterOn.indexOf(headCell.attr);
                                    if (pos === -1) {
                                        filterOn.push(headCell.attr);
                                    } else {
                                        filterOn.splice(pos, 1);
                                    }
                                    this.setState({ filterOn }, () => {
                                        if (pos && this.filterRefs[headCell.attr].current.children[0].children[0].value) {
                                            this.filterRefs[headCell.attr].current.children[0].children[0].value = '';
                                            this.applyFilter();
                                        }
                                    });
                                }}
                            >
                                {this.state.filterOn.includes(headCell.attr) ? <IconFilterOff /> : <IconFilterOn />}
                            </IconButton> : null}
                        </div>
                    </TableCell>)}
                {!schema.noDelete && <TableCell
                    style={{
                        paddingLeft: 20, paddingRight: 20, width: buttonsWidth, textAlign: 'right',
                    }}
                    padding="checkbox"
                >
                    {schema.import ? <IconButton
                        style={{ marginRight: 10 }}
                        size="small"
                        onClick={() => this.setState({ showImportDialog: true })}
                        title={I18n.t('ra_import data from %s file', 'CSV')}
                    >
                        <ImportIcon />
                    </IconButton> : null}
                    {schema.export ? <IconButton
                        style={{ marginRight: 10 }}
                        size="small"
                        onClick={() => this.onExport()}
                        title={I18n.t('ra_Export data to %s file', 'CSV')}
                    >
                        <ExportIcon />
                    </IconButton> : null}
                    <IconButton disabled size="small">
                        <DeleteIcon />
                    </IconButton>
                </TableCell>}
            </TableRow>
        </TableHead>;
    }

    onDelete = index => () => {
        const newValue = JSON.parse(JSON.stringify(this.state.value));
        newValue.splice(index, 1);

        this.setState({ value: newValue, iteration: this.state.iteration + 10_000 }, () =>
            this.applyFilter(false, null, () =>
                this.onChangeWrapper(newValue)));
    };

    onExport() {
        const { schema } = this.props;
        const { value } = this.state;
        const cols = schema.items.map(it => it.attr);
        const lines = [cols.join(';')];
        value.forEach(row => {
            const line = [];
            schema.items.forEach(it => {
                if (row[it.attr].includes(';')) {
                    line.push(`"${row[it.attr]}"`);
                } else {
                    line.push(row[it.attr]);
                }
            });
            lines.push(line.join(';'));
        });
        const el = document.createElement('a');
        el.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`);
        const now = new Date();
        el.setAttribute(
            'download',
            `${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}_${this.props.adapterName}.${this.props.instance}_${this.props.attr}.csv`,
        );

        el.style.display = 'none';
        document.body.appendChild(el);

        el.click();

        document.body.removeChild(el);
    }

    onImport(text) {
        const lines = text.split('\n').map(line => line.replace('\r', '').trim());
        // the first line is header
        const { schema } = this.props;
        const header = lines.shift().split(';').filter(it => it && schema.items.find(it2 => it2.attr === it));
        const values = [];
        lines.forEach(line => {
            const parts = line.split(';');
            const obj = {};
            for (let p = 0; p < parts.length; p++) {
                let value = parts[p];
                if (value.startsWith('"')) {
                    value = value.substring(1);
                    while (p < parts.length && !value.endsWith('"')) {
                        value += `;${parts[++p]}`;
                    }
                    value = value.substring(0, value.length - 1);
                }
                if (parts[p] === 'true') {
                    parts[p] = true;
                } else if (parts[p] === 'false') {
                    parts[p] = false;
                    // eslint-disable-next-line no-restricted-properties
                } else if (window.isFinite(parts[p])) {
                    const attr = this.props.schema.items.find(it => it.attr === header[p]);
                    if (attr && attr.type === 'number') {
                        // if a type of attribute is a "number"
                        parts[p] = parseFloat(parts[p]);
                    }
                }
                obj[header[p]] = parts[p];
            }
            values.push(obj);
        });

        if (values.length) {
            if (this.state.value?.length) {
                this.setState({ showTypeOfImportDialog: values, showImportDialog: false });
            } else {
                this.setState({ value: values, showImportDialog: false });
            }
        } else {
            window.alert('ra_No data found in file');
        }
    }

    onClone = index => () => {
        const newValue = JSON.parse(JSON.stringify(this.state.value));
        const cloned = JSON.parse(JSON.stringify(newValue[index]));
        if (typeof this.props.schema.clone === 'string' && typeof cloned[this.props.schema.clone] === 'string') {
            let i = 1;
            let text = cloned[this.props.schema.clone];
            const pattern = text.match(/(\d+)$/);
            if (pattern) {
                text = text.replace(pattern[0], '');
                i = parseInt(pattern[0], 10) + 1;
            } else {
                text += '_';
            }
            // eslint-disable-next-line no-loop-func
            while (newValue.find(it => it[this.props.schema.clone] === text + i.toString())) {
                i++;
            }
            cloned[this.props.schema.clone] = `${cloned[this.props.schema.clone]}_${i}`;
        }

        newValue.splice(index, 0, cloned);

        this.setState({ value: newValue, iteration: this.state.iteration + 10000 }, () =>
            this.applyFilter(false, null, () =>
                this.onChangeWrapper(newValue)));
    };

    onChangeWrapper = (newValue, updateVisible = false) => {
        this.typingTimer && clearTimeout(this.typingTimer);

        this.typingTimer = setTimeout((value, _updateVisible) => {
            this.typingTimer = null;

            if (this.props.schema.objKeyName) {
                const objValue = arrayToObject(JSON.parse(JSON.stringify(value)), this.props.schema.objKeyName, this.props.schema.objValueName);
                this.onChange(this.props.attr, objValue);
            } else {
                this.onChange(this.props.attr, value);
            }

            if (_updateVisible) {
                this.applyFilter(false, value);
                this.handleRequestSort(this.state.orderBy, true);
            }
        }, 300, newValue, updateVisible);
    };

    onAdd = () => {
        const { schema } = this.props;
        const newValue = JSON.parse(JSON.stringify(this.state.value));
        const newItem = schema.items && schema.items.reduce((accumulator, currentValue) => {
            let defaultValue;
            if (currentValue.defaultFunc) {
                if (this.props.custom) {
                    defaultValue = currentValue.defaultFunc ? this.executeCustom(currentValue.defaultFunc, this.props.schema.default, this.props.data, this.props.instanceObj, newValue.length, this.props.data) : this.props.schema.default;
                } else {
                    defaultValue = currentValue.defaultFunc ? this.execute(currentValue.defaultFunc, this.props.schema.default, this.props.data, newValue.length, this.props.data) : this.props.schema.default;
                }
            } else {
                defaultValue = currentValue.default === undefined ? null : currentValue.default;
            }

            accumulator[currentValue.attr] = defaultValue;
            return accumulator;
        }, {});

        newValue.push(newItem);

        this.setState({ value: newValue }, () =>
            this.applyFilter(false, null, () =>
                this.onChangeWrapper(newValue)));
    };

    isAnyFilterSet() {
        return Object.keys(this.filterRefs).find(attr => this.filterRefs[attr].current?.children[0].children[0].value);
    }

    applyFilter = (clear, value, cb) => {
        value = value || this.state.value;
        let visibleValue = value.map((_, i) => i);
        Object.keys(this.filterRefs).forEach(attr => {
            let valueInputRef = this.filterRefs[attr].current?.children[0].children[0].value;
            if (!clear && valueInputRef) {
                valueInputRef = valueInputRef.toLowerCase();
                visibleValue = visibleValue.filter(idx => value[idx] && value[idx][attr] && value[idx][attr].toLowerCase().includes(valueInputRef));
            } else if (this.filterRefs[attr].current) {
                this.filterRefs[attr].current.children[0].children[0].value = '';
            }
        });

        if (visibleValue.length === value.length) {
            visibleValue = null;
        }

        if (visibleValue === null && this.state.visibleValue === null) {
            cb && cb();
            return;
        }

        if (JSON.stringify(visibleValue) !== JSON.stringify(this.state.visibleValue)) {
            this.setState({ visibleValue }, () => cb && cb());
        } else {
            cb && cb();
        }
    };

    onMoveUp(idx) {
        const newValue = JSON.parse(JSON.stringify(this.state.value));
        const item = newValue[idx];
        newValue.splice(idx, 1);
        newValue.splice(idx - 1, 0, item);
        this.setState({ value: newValue, iteration: this.state.iteration + 10000 }, () =>
            this.applyFilter(false, null, () =>
                this.onChangeWrapper(newValue)));
    }

    onMoveDown(idx) {
        const newValue = JSON.parse(JSON.stringify(this.state.value));
        const item = newValue[idx];
        newValue.splice(idx, 1);
        newValue.splice(idx + 1, 0, item);
        this.setState({ value: newValue, iteration: this.state.iteration + 10000 }, () =>
            this.applyFilter(false, null, () =>
                this.onChangeWrapper(newValue)));
    }

    onDrop(acceptedFiles) {
        const file = acceptedFiles[0];
        const reader = new FileReader();

        reader.onabort = () => console.log('file reading was aborted');
        reader.onerror = () => console.log('file reading has failed');
        reader.onload = () => {
            if (file.size > MAX_SIZE) {
                window.alert(I18n.t('ra_File is too big. Max %sk allowed. Try use SVG.', Math.round(MAX_SIZE / 1024)));
                return;
            }
            const text = new Uint8Array(reader.result)
                .reduce((data, byte) => data + String.fromCharCode(byte), '');

            this.onImport(text);
        };
        reader.readAsArrayBuffer(file);
    }

    showTypeOfImportDialog() {
        if (!this.state.showTypeOfImportDialog) {
            return null;
        }
        return <Dialog
            open={!0}
            onClose={() => this.setState({ showTypeOfImportDialog: false })}
            maxWidth="md"
        >
            <DialogTitle>{I18n.t('ra_Append or replace?')}</DialogTitle>
            <DialogContent>
                {I18n.t('ra_Append %s entries or replace existing?', this.state.showTypeOfImportDialog.length)}
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    color="primary"
                    autoFocus
                    onClick={() => {
                        const value = JSON.parse(JSON.stringify(this.state.value));
                        this.state.showTypeOfImportDialog.forEach(obj => value.push(obj));
                        this.setState({
                            value,
                            iteration: this.state.iteration + 10000,
                            showTypeOfImportDialog: false,
                        }, () =>
                            this.applyFilter(false, null, () =>
                                this.onChangeWrapper(value)));
                    }}
                >
                    {I18n.t('ra_Append')}
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    autoFocus
                    onClick={() => {
                        const value = this.state.showTypeOfImportDialog;
                        this.setState({
                            value,
                            iteration: this.state.iteration + 10000,
                            showTypeOfImportDialog: false,
                        }, () =>
                            this.applyFilter(false, null, () =>
                                this.onChangeWrapper(value)));
                    }}
                >
                    {I18n.t('ra_Replace')}
                </Button>
            </DialogActions>
        </Dialog>;
    }

    showImportDialog() {
        if (!this.state.showImportDialog) {
            return null;
        }
        return <Dialog
            open={!0}
            onClose={() => this.setState({ showImportDialog: false })}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>{I18n.t('ra_Import from %s', 'CSV')}</DialogTitle>
            <DialogContent>
                <Dropzone
                    multiple={false}
                    accept={{ 'text/csv': ['.csv'] }}
                    maxSize={MAX_SIZE}
                    onDragEnter={() => this.setState({ uploadFile: 'dragging' })}
                    onDragLeave={() => this.setState({ uploadFile: true })}
                    onDrop={(acceptedFiles, errors) => {
                        this.setState({ uploadFile: false });
                        if (!acceptedFiles.length) {
                            window.alert((errors && errors[0] && errors[0].errors && errors[0].errors[0] && errors[0].errors[0].message) || I18n.t('ra_Cannot upload'));
                        } else {
                            this.onDrop(acceptedFiles);
                        }
                    }}
                >
                    {({ getRootProps, getInputProps }) => <div
                        className={Utils.clsx(
                            this.props.classes.uploadDiv,
                            this.state.uploadFile === 'dragging' && this.props.classes.uploadDivDragging,
                            this.props.classes.dropZone,
                            !this.state.icon && this.props.classes.dropZoneEmpty,
                        )}
                        {...getRootProps()}
                    >
                        <input {...getInputProps()} />
                        <div className={Utils.clsx(this.props.classes.uploadCenterDiv)}>
                            <div className={this.props.classes.uploadCenterTextAndIcon}>
                                <ImportIcon className={this.props.classes.uploadCenterIcon} />
                                <div className={this.props.classes.uploadCenterText}>
                                    {
                                        this.state.uploadFile === 'dragging' ? I18n.t('ra_Drop file here') :
                                            I18n.t('ra_Place your files here or click here to open the browse dialog')
                                    }
                                </div>
                            </div>
                        </div>
                    </div>}
                </Dropzone>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    onClick={() => this.setState({ showImportDialog: false })}
                    color="primary"
                    startIcon={<IconClose />}
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>;
    }

    renderItem(/* error, disabled, defaultValue */) {
        const { classes, schema } = this.props;
        let { visibleValue } = this.state;

        if (!this.state.value) {
            return null;
        }

        visibleValue = visibleValue || this.state.value.map((_, i) => i);

        const doAnyFilterSet = this.isAnyFilterSet();

        return <Paper className={classes.paper}>
            {this.showImportDialog()}
            {this.showTypeOfImportDialog()}
            {schema.label ? <div className={classes.label}>
                <Toolbar
                    variant="dense"
                    className={classes.rootTool}
                >
                    <Typography className={classes.title} variant="h6" id="tableTitle" component="div">
                        {this.getText(schema.label)}
                    </Typography>
                </Toolbar>
            </div> : null}
            <TableContainer>
                <Table className={classes.table} size="small">
                    {this.enhancedTableHead(!doAnyFilterSet && !this.state.orderBy ? 120 : 64, doAnyFilterSet)}
                    <TableBody>
                        {visibleValue.map((idx, i) =>
                            <TableRow
                                hover
                                key={`${idx}_${i}`}
                            >
                                {schema.items && schema.items.map(headCell =>
                                    <TableCell key={`${headCell.attr}_${idx}`} align="left">
                                        {this.itemTable(headCell.attr, this.state.value[idx], idx)}
                                    </TableCell>)}
                                {!schema.noDelete && <TableCell align="left" className={classes.buttonCell}>
                                    {!doAnyFilterSet && !this.state.orderBy ? (i ? <Tooltip title={I18n.t('ra_Move up')}>
                                        <IconButton size="small" onClick={() => this.onMoveUp(idx)}>
                                            <UpIcon />
                                        </IconButton>
                                    </Tooltip> : <div className={classes.buttonEmpty} />) : null}
                                    {!doAnyFilterSet && !this.state.orderBy ? (i < visibleValue.length - 1 ? <Tooltip title={I18n.t('ra_Move down')}>
                                        <IconButton size="small" onClick={() => this.onMoveDown(idx)}>
                                            <DownIcon />
                                        </IconButton>
                                    </Tooltip> : <div className={classes.buttonEmpty} />) : null}
                                    <Tooltip title={I18n.t('ra_Delete current row')}>
                                        <IconButton size="small" onClick={this.onDelete(idx)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                    {this.props.schema.clone ? <Tooltip title={I18n.t('ra_Clone current row')}>
                                        <IconButton size="small" onClick={this.onClone(idx)}>
                                            <CopyContentIcon />
                                        </IconButton>
                                    </Tooltip> : null}
                                </TableCell>}
                            </TableRow>)}
                        {!schema.noDelete && visibleValue.length >= (schema.showSecondAddAt || 5) ?
                            <TableRow>
                                <TableCell colSpan={schema.items.length + 1}>
                                    <Tooltip title={doAnyFilterSet ? I18n.t('ra_Cannot add items with set filter') : I18n.t('ra_Add row')}>
                                        <span>
                                            <IconButton size="small" color="primary" disabled={!!doAnyFilterSet && !this.props.schema.allowAddByFilter} onClick={this.onAdd}>
                                                <AddIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </TableCell>
                            </TableRow> : null}
                    </TableBody>
                </Table>
                {!visibleValue.length && this.state.value.length ?
                    <div className={classes.filteredOut}>
                        <Typography className={classes.title} variant="h6" id="tableTitle" component="div">
                            {I18n.t('ra_All items are filtered out')}
                            <IconButton
                                size="small"
                                onClick={() => this.applyFilter(true)}
                            >
                                <CloseIcon />
                            </IconButton>
                        </Typography>
                    </div> : null}
            </TableContainer>
            {schema.help ?
                <FormHelperText>{this.renderHelp(this.props.schema.help, this.props.schema.helpLink, this.props.schema.noTranslation)}</FormHelperText>
                : null}
            {this.state.errorMessage ? <div style={{ display: 'flex', padding: '5px' }}>
                <ErrorIcon color="error" />
                <span style={{ color: 'red', alignSelf: 'center' }}>{this.state.errorMessage}</span>
            </div> : null}
        </Paper>;
    }
}

ConfigTable.propTypes = {
    socket: PropTypes.object.isRequired,
    changed: PropTypes.bool,
    themeType: PropTypes.string,
    themeName: PropTypes.string,
    style: PropTypes.object,
    className: PropTypes.string,
    data: PropTypes.object.isRequired,
    schema: PropTypes.object,
    onError: PropTypes.func,
    onChange: PropTypes.func,
};

export default withStyles(styles)(ConfigTable);
