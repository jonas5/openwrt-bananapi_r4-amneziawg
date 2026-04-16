'use strict';
'require view';
'require rpc';
'require poll';
'require dom';
'require ui';


var callgetAwgInstances = rpc.declare({
	object: 'luci.amneziawg',
	method: 'getAwgInstances'
});

var callgetAwgTraffic = rpc.declare({
	object: 'luci.amneziawg',
	method: 'getAwgTraffic',
	expect: {  }
});

function timestampToStr(timestamp) {
	if (timestamp < 1)
		return _('Never', 'No AmneziaWG peer handshake yet');

	var seconds = (Date.now() / 1000) - timestamp;
	var ago;

	if (seconds < 60)
		ago = _('%ds ago').format(seconds);
	else if (seconds < 3600)
		ago = _('%dm ago').format(seconds / 60);
	else if (seconds < 86401)
		ago = _('%dh ago').format(seconds / 3600);
	else
		ago = _('over a day ago');

	return (new Date(timestamp * 1000)).toUTCString() + ' (' + ago + ')';
}

function formatSpeed(bytesPerSecond) {
	if (bytesPerSecond < 1024)
		return _('%d B/s').format(bytesPerSecond);
	else if (bytesPerSecond < 1024 * 1024)
		return _('%.1f KB/s').format(bytesPerSecond / 1024);
	else if (bytesPerSecond < 1024 * 1024 * 1024)
		return _('%.1f MB/s').format(bytesPerSecond / 1024 / 1024);
	else
		return _('%.1f GB/s').format(bytesPerSecond / 1024 / 1024 / 1024);
}

function createTrafficGraph(instanceName, initialRx, initialTx) {
	var container = E('div', {
		'class': 'cbi-chart',
		'id': 'traffic-' + instanceName,
		'style': 'height:120px; margin:10px 0'
	});

	// Simple bar display for download/upload
	var bars = E('div', {
		'style': 'display:flex; gap:20px; justify-content:center; align-items:flex-end; height:100px'
	});

	// Download bar
	var dlBar = E('div', {
		'style': 'display:flex; flex-direction:column; align-items:center'
	});
	dlBar.appendChild(E('div', {
		'style': 'width:60px; background:#0a0; height:0px',
		'id': 'dl-bar-' + instanceName,
		'class': 'traffic-bar'
	}));
	dlBar.appendChild(E('span', { 'class': 'label' }, [_('Download')]));
	dlBar.appendChild(E('span', { 'id': 'dl-speed-' + instanceName, 'style': 'font-size:12px' }, ['0 B/s']));

	// Upload bar
	var ulBar = E('div', {
		'style': 'display:flex; flex-direction:column; align-items:center'
	});
	ulBar.appendChild(E('div', {
		'style': 'width:60px; background:#a0a; height:0px',
		'id': 'ul-bar-' + instanceName,
		'class': 'traffic-bar'
	}));
	ulBar.appendChild(E('span', { 'class': 'label' }, [_('Upload')]));
	ulBar.appendChild(E('span', { 'id': 'ul-speed-' + instanceName, 'style': 'font-size:12px' }, ['0 B/s']));

	bars.appendChild(dlBar);
	bars.appendChild(ulBar);
	container.appendChild(bars);

	return container;
}

function handleInterfaceDetails(iface) {
	var features = iface.features || {};
	var featureList = [
		_('Transport'), features.transport || 'UDP',
		_('Kill Switch'), features.kill_switch === '1' ? _('Enabled') : _('Disabled'),
		_('DNS Leak Protection'), features.dns_leak_protection === '1' ? _('Enabled') : _('Disabled'),
		_('Allowed Clients'), features.allowed_clients || _('All clients'),
		_('Download Limit'), features.download_limit || _('Unlimited'),
		_('Upload Limit'), features.upload_limit || _('Unlimited'),
		_('Interface Addresses'), features.addresses || '-'
	];

	ui.showModal(_('Interface Details'), [
		ui.itemlist(E([]), [
			_('Name'), iface.name,
			_('Public Key'), E('code', [ iface.public_key ]),
			_('Listen Port'), iface.listen_port,
			_('Firewall Mark'), iface.fwmark != 'off' ? iface.fwmark : E('em', _('none'))
		]),
		E('h4', { 'style': 'margin-top:15px' }, [_('Enabled Features')]),
		ui.itemlist(E([]), featureList),
		E('div', { 'class': 'right' }, [
			E('button', {
				'class': 'btn cbi-button',
				'click': ui.hideModal
			}, [ _('Dismiss') ])
		])
	]);
}

function handlePeerDetails(peer) {
	ui.showModal(_('Peer Details'), [
		ui.itemlist(E([]), [
			_('Description'), peer.name,
			_('Public Key'), E('code', [ peer.public_key ]),
			_('Endpoint'), peer.endpoint,
			_('Allowed IPs'), (Array.isArray(peer.allowed_ips) && peer.allowed_ips.length) ? peer.allowed_ips.join(', ') : E('em', _('none')),
			_('Received Data'), '%1024mB'.format(peer.transfer_rx),
			_('Transmitted Data'), '%1024mB'.format(peer.transfer_tx),
			_('Latest Handshake'), timestampToStr(+peer.latest_handshake),
			_('Keep-Alive'), (peer.persistent_keepalive != 'off') ? _('every %ds', 'AmneziaWG keep alive interval').format(+peer.persistent_keepalive) : E('em', _('none')),
		]),
		E('div', { 'class': 'right' }, [
			E('button', {
				'class': 'btn cbi-button',
				'click': ui.hideModal
			}, [ _('Dismiss') ])
		])
	]);
}

function renderPeerTable(instanceName, peers) {
	var t = new L.ui.Table(
		[
			_('Peer'),
			_('Endpoint'),
			_('Data Received'),
			_('Data Transmitted'),
			_('Latest Handshake')
		],
		{
			id: 'peers-' + instanceName
		},
		E('em', [
			_('No peers connected')
		])
	);

	t.update(peers.map(function(peer) {
		return [
			[
				peer.name || '',
				E('div', {
					'style': 'cursor:pointer',
					'click': ui.createHandlerFn(this, handlePeerDetails, peer)
				}, [
					E('p', [
						peer.name ? E('span', [ peer.name ]) : E('em', [ _('Untitled peer') ])
					]),
					E('span', {
						'class': 'ifacebadge hide-sm',
						'data-tooltip': _('Public key: %h', 'Tooltip displaying full AmneziaWG peer public key').format(peer.public_key)
					}, [
						E('code', [ peer.public_key.replace(/^(.{5}).+(.{6})$/, '$1…$2') ])
					])
				])
			],
			peer.endpoint,
			[ +peer.transfer_rx, '%1024mB'.format(+peer.transfer_rx) ],
			[ +peer.transfer_tx, '%1024mB'.format(+peer.transfer_tx) ],
			[ +peer.latest_handshake, timestampToStr(+peer.latest_handshake) ]
		];
	}));

	return t.render();
}

return view.extend({
	lastStats: {},

	renderIfaces: function(ifaces, traffic) {
		var res = [
			E('h2', [ _('AmneziaWG Status') ])
		];

		for (var instanceName in ifaces) {
			var iface = ifaces[instanceName];
			var features = iface.features || {};
			var traffic_data = traffic[instanceName] || { rx_bytes: '0', tx_bytes: '0' };

			// Feature badges
			var featureBadges = [];
			if (features.transport === 'tcp')
				featureBadges.push(E('span', { 'class': 'label', 'style': 'background:#f60' }, ['TCP']));
			if (features.kill_switch === '1')
				featureBadges.push(E('span', { 'class': 'label', 'style': 'background:#f00' }, [_('Kill Switch')]));
			if (features.dns_leak_protection === '1')
				featureBadges.push(E('span', { 'class': 'label', 'style': 'background:#00f' }, [_('DNS Protect')]));
			if (features.allowed_clients)
				featureBadges.push(E('span', { 'class': 'label', 'style': 'background:#0a0' }, [_('Client Filter')]));
			if (features.download_limit || features.upload_limit)
				featureBadges.push(E('span', { 'class': 'label', 'style': 'background:#a0a' }, [_('Limited')]));

			// Traffic stats
			var rx = +traffic_data.rx_bytes;
			var tx = +traffic_data.tx_bytes;

			res.push(
				E('h3', [ _('Instance "%h"', 'AmneziaWG instance heading').format(instanceName) ]),
				E('div', { 'style': 'display:flex; gap:10px; align-items:center; margin-bottom:10px' }, [
					E('span', { 'class': 'ifacebadge', 'style': 'cursor:pointer',
						'click': ui.createHandlerFn(this, handleInterfaceDetails, iface)
					}, [
						E('img', { 'src': L.resource('icons', 'amneziawg.svg') }),
						'\xa0',
						instanceName
					]),
					E('span', { 'style': 'opacity:.8' }, [
						' · ',
						_('Port %d', 'AmneziaWG listen port').format(iface.listen_port),
						' · ',
						E('code', { 'click': '' }, [ iface.public_key ])
					])
				]),

				// Feature badges row
				E('div', { 'style': 'display:flex; gap:5px; margin-bottom:10px', 'id': 'features-' + instanceName },
					featureBadges.length > 0 ? featureBadges : [E('em', { 'style': 'font-size:12px; opacity:.6' }, [_('No special features enabled')]]
				),

				// Traffic bars
				E('div', { 'style': 'display:flex; gap:30px; margin:15px 0; padding:10px; background:#f0f0f0; border-radius:5px' }, [
					E('div', { 'style': 'flex:1; text-align:center' }, [
						E('span', { 'style': 'font-size:12px; color:#0a0; font-weight:bold' }, [_('Download')]),
						E('div', { 'style': 'font-size:24px; margin:5px 0' }, ['%1024mB'.format(rx)]),
						E('span', { 'id': 'rx-rate-' + instanceName, 'style': 'font-size:12px; color:#666' }, ['0 KB/s'])
					]),
					E('div', { 'style': 'flex:1; text-align:center' }, [
						E('span', { 'style': 'font-size:12px; color:#a0a; font-weight:bold' }, [_('Upload')]),
						E('div', { 'style': 'font-size:24px; margin:5px 0' }, ['%1024mB'.format(tx)]),
						E('span', { 'id': 'tx-rate-' + instanceName, 'style': 'font-size:12px; color:#666' }, ['0 KB/s'])
					])
				]),

				renderPeerTable(instanceName, iface.peers)
			);
		}

		if (res.length == 2)
			res.push(E('p', { 'class': 'center', 'style': 'margin-top:5em' }, [
				E('em', [ _('No AmneziaWG interfaces configured.') ])
			]));

		return E([], res);
	},

	render: function() {
		var self = this;
		poll.add(L.bind(function () {
			return Promise.all([
				callgetAwgInstances(),
				callgetAwgTraffic()
			]).then(L.bind(function(results) {
				var ifaces = results[0];
				var traffic = results[1];

				// Calculate speeds
				var now = Date.now();
				for (var name in ifaces) {
					var oldStats = self.lastStats[name] || { rx: 0, tx: 0, time: now };
					var newRx = 0, newTx = 0;

					// Get traffic stats
					if (traffic[name]) {
						newRx = +traffic[name].rx_bytes;
						newTx = +traffic[name].tx_bytes;
					}

					var timeDiff = (now - oldStats.time) / 1000;
					if (timeDiff > 0) {
						var rxSpeed = (newRx - oldStats.rx) / timeDiff;
						var txSpeed = (newTx - oldStats.tx) / timeDiff;

						// Update the speed displays
						var rxRateEl = document.getElementById('rx-rate-' + name);
						var txRateEl = document.getElementById('tx-rate-' + name);
						if (rxRateEl) rxRateEl.textContent = formatSpeed(rxSpeed);
						if (txRateEl) txRateEl.textContent = formatSpeed(txSpeed);
					}

					self.lastStats[name] = { rx: newRx, tx: newTx, time: now };
				}

				dom.content(
					document.querySelector('#view'),
					self.renderIfaces(ifaces, traffic)
				);
			}, this));
		}, this), 3);

		return E([], [
			E('h2', [ _('AmneziaWG Status') ]),
			E('p', { 'class': 'center', 'style': 'margin-top:5em' }, [
				E('em', [ _('Loading data…') ])
			])
		]);
	},

	handleReset: null,
	handleSaveApply: null,
	handleSave: null
});
