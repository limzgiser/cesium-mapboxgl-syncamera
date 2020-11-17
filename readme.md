## cesium-mapboxgl-syncamera
 一种mapboxgl 和 cesium 相机同步方法。

mapbox-gl 相机  《==》 cesium相机

### mapbox-gl相机

- center    定图定位中心
- pitch       地图倾角
- bearing   地图旋转角
- zoom      地图级别

### cesium 相机 

相机位置、角度（欧拉角）

- position 相机位置
- pitch    相机抬头、低头角度
- heading  相机左右、摇头角度
- roll    相机沿着看的方向轴旋转角

### 关键公式

- 根据mapbox中zoom级别计算cesium中相机高度

``` javascript
function getElevationByZoom(map, zoom) {
	// 长半轴 6378137
 return (2 * Math.PI * 6378137.0) / Math.pow(2, zoom) / 2 / Math.tan(map.transform._fov / 2);
}
```

- 根据mapbox中zoom级别计算cesium中相机高度

```javascript
function getZoomByElevation(map, elevation) {
	return Math.log2((2 * Math.PI * 6378137.0) / (2 * elevation * Math.tan(map.transform._fov / 2)));
}
```

### 问题

- 计算为近视计算、不过相互变换后的差距不大，可以根据 具体情况调试参数。
- cesium pitch倾角范围为 - 90至0，mapbox中为 0 - 60 当cesium倾角高度60时候，同步到mapbox中会计算出偏差比较大的相机位置
- 计算收到屏幕宽度的影响

### 关于问题

从mapbox中zoom计算cesium相机高度时，当前地图文档的尺寸是对计算结果有影响的。如果是桌面端，你可以参考我总结出来的zoom差的计算结果。

```javascript
// zoom to elevation 
getElevationByZoom(map, pzoom) {
    // 长半轴 6378137
    let szoom = 0;
    let clientW = document.body.clientWidth;
    if (clientW < 960) {
      szoom = 1 - 960 / document.body.clientWidth;
    } else {
      szoom = document.body.clientWidth / 960 - 1;   // 1920 1 / 1440 0.5 / 960 0
    }
    const zoom = pzoom - szoom; // * ;
    return (
      (2 * Math.PI * 6378137.0) /
      Math.pow(2, zoom) /
      2 /
      Math.tan(map.transform._fov / 2)
    );
  }
```

```javascript
// elevation to zoom
getZoomByElevation(map, elevation) {
    // console.log(elevation)
    let szoom = 0;
    let clientW = document.body.clientWidth;
    if (clientW < 960) {
      szoom = 1 - 960 / document.body.clientWidth;
    } else {
      szoom = document.body.clientWidth / 960 - 1;   // 1920 1 / 1440 0.5 / 960 0
    }
    return Math.log2(
      (2 * Math.PI * 6378137.0) /
      (2 * elevation * Math.tan(map.transform._fov / 2))
    ) + szoom;
  }

```



```javascript
updateMapBoxCamera(mapboxmap) {
    if (this.cesiumCameraInfo) {
      const { center, height, pitch, bearing } = this.cesiumCameraInfo;
      this.updateMapboxView(mapboxmap, center, height, pitch + 90, bearing);
    }

  }
  updateCesiumView(mapboxmap) {
    const viewer = this.cesiumMapService.getViewer();
    this.updateCesiumCamera(mapboxmap, viewer);
  }
  updateCesiumCamera(mapboxmap, viewer) {
    const pitch = mapboxmap.getPitch();
    const { lng, lat } = mapboxmap.getCenter();
    const zoom = mapboxmap.getZoom();
    const cameraElevation = this.getElevationByZoom(mapboxmap, zoom);
    let bearing = mapboxmap.getBearing();
    if (bearing < 0) {
      bearing = bearing + 360;
    }
    const heading = Cesium.Math.toRadians(bearing);
    const lookTarget = Cesium.Cartesian3.fromDegrees(lng, lat);
    const cameraPitch = Cesium.Math.toRadians(pitch - 90 + 0.01); // 加上0.0001 镜头垂直向下看的时候，cesium不能heading,？？？
    // const range = cameraElevation / Math.sin(((90 - pitch) * Math.PI) / 180);
    viewer.camera.lookAt(
      lookTarget,
      new Cesium.HeadingPitchRange(
        heading,
        cameraPitch,
        // range * Math.sin(((90 - pitch) * Math.PI) / 180)
        cameraElevation
      )
    );
  }
  updateMapboxView(mapboxmap, center, elevation, cameraPitch, cameraBearing) {
    const zoom = this.getZoomByElevation(mapboxmap, elevation);
    mapboxmap.setZoom(zoom);
    mapboxmap.setCenter(center);
    mapboxmap.setBearing(cameraBearing);
    mapboxmap.setPitch(cameraPitch);
  }
```











