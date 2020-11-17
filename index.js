(function () {
	mapboxgl.accessToken =
		'pk.eyJ1IjoiYWxhbnRnZW8tcHJlc2FsZXMiLCJhIjoiY2pxcmZ1cW1mMG1tcDN4bDVvYzA4MWg5MyJ9.7QtVj_0ythHwEg1n_zaRTQ';

	let mapboxmap = new mapboxgl.Map({
		container: 'mapbox-map',
		style: {
			version: 8,
			name: 'test',
			sources: {
				image01: {
					type: 'raster',
					tiles: ['//mt1.google.cn/vt/lyrs=s,h&gl=cn&x={x}&y={y}&z={z}&s=Gali'],
					tileSize: 256,
				},
			},
			layers: [
				{
					id: '6image01',
					type: 'raster',
					source: 'image01',
					layout: {},
					paint: {},
				},
			],
		},
		center: [120.6977, 31.3235],
		zoom: 15,
		pitch: 30,
		bearing: 20,
		antialias: true,
		renderWorldCopies: false,
	});
	let mapType = 'mapbox'; // mapbox / cesium
	// const layer = new Cesium.ArcGisMapServerImageryProvider({
	// 	url: '//mt1.google.cn/vt/lyrs=s,h&gl=cn&x={x}&y={y}&z={z}&s=Gali',
	// });
	const layer = new Cesium.UrlTemplateImageryProvider({
		url: 'http://mt1.google.cn/vt/lyrs=s,h&gl=cn&x={x}&y={y}&z={z}&s=Gali',
	});

	let viewer = new Cesium.Viewer('cesium-map', {
		imageryProvider: layer, // 指定此项 则必须设置： baseLayerPicker: false
		homeButton: false,
		selectionIndicator: false,
		animation: false,
		baseLayerPicker: false,
		sceneMode: Cesium.SceneMode.COLUMBUS_VIEW,
		geocoder: false,
		timeline: false,
		sceneModePicker: false,
		navigationHelpButton: false,
		infoBox: false,
		fullscreenButton: false,
	});
	viewer.scene.screenSpaceCameraController.tiltEventTypes = [Cesium.CameraEventType.RIGHT_DRAG];
	viewer.scene.screenSpaceCameraController.zoomEventTypes = [Cesium.CameraEventType.WHEEL];
	const { xmin, ymin, xmax, ymax } = {
		xmin: 120.67967269912378,
		ymin: 31.2938931596835,
		xmax: 120.70445265714949,
		ymax: 31.34402267651852,
	};

	const rectangle = Cesium.Rectangle.fromDegrees(xmin, ymin, xmax, ymax);
	viewer.camera.setView({
		destination: rectangle,
	});
	window.viewer = viewer;
	window.map = mapboxmap;
	mapboxmap.on('mousedown', (e) => {
		mapType = 'mapbox';
	});
	mapboxmap.on('move', (e) => {
		if (mapType == 'mapbox') {
			updateCesiumCamera();
		}
	});
	viewer.scene.camera.moveEnd
		.addEventListener(() => {
			if (mapType == 'cesium') {
				let { z } = viewer.camera.position;
				let bearing = (viewer.camera.heading / Math.PI) * 180;
				let pitch = (viewer.camera.pitch / Math.PI) * 180;
				updateMapboxView(getCesiumMapCenter(viewer), z, pitch + 90, bearing);
			}
		})
		.bind(viewer.camera);

	let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
	handler.setInputAction(function (e) {
		mapType = 'cesium';
		viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
	}, Cesium.ScreenSpaceEventType.LEFT_DOWN);

	// 更新cesium camera
	function updateCesiumCamera() {
		let pitch = mapboxmap.getPitch();
		let { lng, lat } = mapboxmap.getCenter();
		let zoom = mapboxmap.getZoom();
		let cameraElevation = getElevationByZoom(mapboxmap, zoom);
		let bearing = mapboxmap.getBearing();
		if (bearing < 0) {
			bearing = bearing + 360;
		}

		let heading = Cesium.Math.toRadians(bearing);
		let lookTarget = Cesium.Cartesian3.fromDegrees(lng, lat);

		let cameraPitch = Cesium.Math.toRadians(pitch - 90 + 0.01); // 加上0.01 镜头垂直向下看的时候，cesium不能heading,？？？
		let range = cameraElevation / Math.sin(((90 - pitch) * Math.PI) / 180);
		console.log(pitch - 90);
		viewer.camera.lookAt(
			lookTarget,
			new Cesium.HeadingPitchRange(heading, cameraPitch, range * Math.sin(((90 - pitch) * Math.PI) / 180))
		);
	}

	function updateMapboxView(center, elevation, cameraPitch, cameraBearing) {
		const zoom = getZoomByElevation(mapboxmap, elevation);
		mapboxmap.setZoom(zoom);
		mapboxmap.setCenter(center);
		mapboxmap.setBearing(cameraBearing);
		mapboxmap.setPitch(cameraPitch);
	}

	function getElevationByZoom(map, zoom) {
		// 长半轴 6378137
		return (2 * Math.PI * 6378137.0) / Math.pow(2, zoom) / 2 / Math.tan(map.transform._fov / 2);
	}

	function getZoomByElevation(map, elevation) {
		return Math.log2((2 * Math.PI * 6378137.0) / (2 * elevation * Math.tan(map.transform._fov / 2)));
	}

	function getCesiumMapCenter(viewer) {
		var windowPosition = new Cesium.Cartesian2(viewer.container.clientWidth / 2, viewer.container.clientHeight / 2);
		var pickRay = viewer.scene.camera.getPickRay(windowPosition);
		var pickPosition = viewer.scene.globe.pick(pickRay, viewer.scene);
		var pickPositionCartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(pickPosition);
		let lng = pickPositionCartographic.longitude * (180 / Math.PI);
		let lat = pickPositionCartographic.latitude * (180 / Math.PI);
		let coor = [lng, lat];
		return coor;
	}
})();
