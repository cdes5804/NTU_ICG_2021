'use strict'

const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec3 aFrontColor;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;

	varying vec4 fragcolor;
    varying highp vec3 vLighting;

    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        fragcolor = vec4(aFrontColor.rgb, 1.0);

        highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
        highp vec3 directionalLightColor = vec3(1, 1, 1);
        highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

        highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

        highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
        vLighting = ambientLight + (directionalLightColor * directional);
    }
`;

const fsSource = `
    precision mediump float;

    varying vec4 fragcolor;
    varying highp vec3 vLighting;

    void main(void) {
        gl_FragColor = fragcolor;
    }
`;

const initWebGL = (canvas) => {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    return gl;
}

const loadShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('Uable to compile shader program');
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

const initShader = (gl) => {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize shader program');
        return null;
    }

    return shaderProgram;
}

const getObject = async (object) => {
    const url = `./model/${object}.json`;
    const data = await (await fetch(url)).json();

    return data;
}

const initBuffer = (gl, object) => {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(object.vertexPositions),
                  gl.STATIC_DRAW);
    positionBuffer.itemSize = 3;
    positionBuffer.numItems = object.vertexPositions.length / 3;

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(object.vertexNormals),
                  gl.STATIC_DRAW);
    normalBuffer.itemSize = 3;
    normalBuffer.numItems = object.vertexNormals.length / 3;

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(object.vertexFrontcolors),
                  gl.STATIC_DRAW);
    colorBuffer.itemSize = 3;
    colorBuffer.numItems = object.vertexFrontcolors.length / 3;

    return {
        position: positionBuffer,
        normal: normalBuffer,
        color: colorBuffer,
    };
}

const degToRad = (deg) => {
    return deg * Math.PI / 180;
}

const drawScene = (gl, programInfo, buffers) => {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (buffers.positionBuffer === null ||
        buffers.normalBuffer === null ||
        buffers.colorBuffer === null) {

        return;
    }

    const fieldOfView = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;

    const projectionMatrix = mat4.create();
    const normalMatrix = mat4.create();
    const modelViewMatrix = mat4.create();

    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);

    mat4.translate(modelViewMatrix,
                   modelViewMatrix, 
                   [0, 0, -50]);

    mat4.rotate(modelViewMatrix,
                modelViewMatrix,
                programInfo.rotation,
                [0, 1, 0]);
    
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    
    {
        const numComponents = buffers.position.itemSize;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocation.position,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocation.position);
    }

    {
        const numComponents = buffers.normal.itemSize;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            programInfo.attribLocation.normal,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocation.normal);
    }
    
    {
        const numComponents = buffers.color.itemSize;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.attribLocation.color,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocation.color); 
    }

    gl.useProgram(programInfo.program);
    gl.uniformMatrix4fv(
        programInfo.uniformLocation.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocation.normalMatrix,
        false,
        normalMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocation.modelViewMatrix,
        false,
        modelViewMatrix);
    
    {
        const offset = 0;
        const vertexCount = buffers.position.numItems;
        gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
    }
}

const animate = (gl, programInfo, buffers) => {
    let then = 0;

    const render = (now) => {
        now *= 0.001
        const deltaTime = now - then;
        then = now;

        drawScene(gl, programInfo, buffers);

        programInfo.rotation += deltaTime;
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

const main = async () => {
    const canvas = document.querySelector('#glcanvas');
    const gl = initWebGL(canvas);
    const shaderProgram = initShader(gl);

    const programInfo = {
        program: shaderProgram,
        rotation: 0,
        attribLocation: {
            position: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            normal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            color: gl.getAttribLocation(shaderProgram, 'aFrontColor'),
        },
        uniformLocation: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    const teapot = await getObject('Teapot');
    const buffers = initBuffer(gl, teapot);

    gl.clearColor(0.0, 0.2, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);

    animate(gl, programInfo, buffers);
}

main();