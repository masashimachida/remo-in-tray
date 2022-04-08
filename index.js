const electron = require('electron')
    , request = require('request')
    , log = require('electron-log');

process.on('uncaughtException', (err) => {
    log.error(err)
    electron.quit()
})

require('dotenv').config({path: __dirname + '/.env'})

const TOKEN = process.env.TOKEN
    , APPLIANCE_ID = process.env.APPLIANCE_ID

let tray = null

let state = {
    modes: [],
    currentTemp: undefined,
    settingTemp: undefined,
    mode: undefined,
    volume: undefined,
    power: false,
}

electron.app.on('ready', () => {

    electron.app.dock.hide();

    tray = new electron.Tray(`${__dirname}/icon-16.png`);

    function __trans(str) {
        const map = {
            'auto': '自動',
            'cool': '冷房',
            'dry': 'ドライ',
            'warm': '暖房'
        }
        return map[str] || str
    }

    function updateDevice() {
        API.getDevices()
            .then(response => response[0].newest_events.te.val)
            .then((val) => state.currentTemp = val)
            .then(render)
    }

    function updateAppliance() {
        API.getAppliances()
            .then(response => response.find(ap => ap.id === APPLIANCE_ID))
            .then(ap => {
                if (ap) {
                    state.modes = ap.aircon.range.modes
                    state.power = ap.settings.button === ''
                    state.settingTemp = ap.settings.temp
                    state.mode = ap.settings.mode
                    state.volume = ap.settings.vol
                }
            })
            .then(render)
    }


    // rendering

    function render() {
        updateTrayTitle()
        updateTrayContextMenu()
    }

    function updateTrayTitle() {
        if (tray) {

            const items = []
            if (state.power) items.push('[運転中]')
            items.push('気温:' + state.currentTemp)
            if (state.power) {
                items.push(__trans(state.mode))
                items.push('設定温度:' + __trans(state.settingTemp))
                items.push('風量:' + __trans(state.volume))
            }

            tray.setTitle(' ' + items.join(" "), {
                fontType: 'monospaced'
            })
        }
    }

    function updateTrayContextMenu() {
        if (!tray) return

        const menus = []

        menus.push(
            state.power
                ? {label: '電源OFF', click: () => onClickPower(false)}
                : {label: '電源ON', click: () => onClickPower(true)}
        )

        if (state.power) {

            const range = state.modes[state.mode]

            const modeSubMenus = Object.keys(state.modes)
                    .map(m => ({label: __trans(m), click: () => onClickMode(m), enabled: m !== state.mode})),
                tempSubMenus = range.temp
                    .map(t => ({label: __trans(t), click: () => onClickTemp(t), enabled: t !== state.settingTemp})),
                volSubMenus = range.vol
                    .map(v => ({label: __trans(v), click: () => onClickVolume(v), enabled: v !== state.volume}))

            menus.push({type: 'separator'})
            menus.push({label: 'モード', submenu: modeSubMenus})
            menus.push({label: '設定温度', submenu: tempSubMenus})
            menus.push({label: '風量', submenu: volSubMenus})
            menus.push({label: 'ふりふり', click: () => onClickHuriHuri()})
        }

        menus.push({type: 'separator'})
        menus.push({label: '終了', role: 'quit'})

        tray.setContextMenu(electron.Menu.buildFromTemplate(menus));
    }


    // ClickHandlers

    function onClickPower(val) {
        state.power = val
        API.postAirconSettings('button=' + (val === true ? '' : 'power-off'))
            .then(render)
    }

    function onClickMode(val) {
        state.mode = val
        API.postAirconSettings('operation_mode=' + val)
            .then(updateAppliance)
    }

    function onClickTemp(val) {
        state.settingTemp = val
        API.postAirconSettings('temperature=' + val)
            .then(render)
    }

    function onClickVolume(val) {
        state.volume = val
        API.postAirconSettings('air_volume=' + val)
            .then(render)
    }

    function onClickHuriHuri() {
        API.postAirconSettings('button=airdir-swing')
    }

    setInterval(() => {
        updateDevice()
        updateAppliance()
    }, 1000 * 60 * 3)
    updateDevice()
    updateAppliance()

})


class API {
    static getDevices() {
        return API._request('GET', '/devices')
    }

    static getAppliances() {
        return API._request('GET', '/appliances')
    }

    static postAirconSettings(data) {
        return API._request('POST', `/appliances/${APPLIANCE_ID}/aircon_settings`, data)
    }

    static _request(method, path, form = undefined) {
        // log.info('[REQUEST API]', method, path, form)
        return new Promise((resolve, reject) => {
            const url = "https://api.nature.global/1" + path,
                headers = {
                    "Accept": "application/json",
                    "Authorization": "Bearer " + TOKEN,
                    "Content-type": "application/x-www-form-urlencoded",
                }
            request({url, method, headers, form}, (error, response, body) => {
                error
                    ? reject(error)
                    : resolve(JSON.parse(body))
            })
        })
    }
}

