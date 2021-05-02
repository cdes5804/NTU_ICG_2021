'use strict';

const objectsToDraw = ['Teapot'];
const objectInfo = [];
const backgroundColor = [0, 0, 0];
let flatProgram = null;
let gouraudProgram = null;
let phongProgram = null;

const flatVsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aFrontColor;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelViewMatrix;

	varying vec4 vertexViewSpace;
    varying vec3 vColor;

    void main(void) {
        vertexViewSpace = uModelViewMatrix * aVertexPosition;
        gl_Position = uProjectionMatrix * vertexViewSpace;
        vColor = aFrontColor;
    }
`;

const flatFsSource = `
    #extension GL_OES_standard_derivatives : enable
    #define NUM_LIGHT 3
    precision mediump float;

    uniform float Ka;   // Ambient reflection coefficient
    uniform float Kd;   // Diffuse reflection coefficient
    uniform float Ks;   // Specular reflection coefficient
    uniform float shininess;

    varying vec4 vertexViewSpace;
    varying vec3 vColor;
    
    uniform vec3 uLightSource[NUM_LIGHT];
    uniform vec3 uLightColor[NUM_LIGHT];
    
    void main(void) {
        vec3 U = dFdx(vertexViewSpace.xyz);                     
        vec3 V = dFdy(vertexViewSpace.xyz);
        vec3 N = normalize(cross(U, V));

        vec3 vertexPosition = vec3(vertexViewSpace) / vertexViewSpace.w;

        vec3 ambient = Ka * vColor;
        vec3 diffuse;
        vec3 specular;
        
        for (int i = 0; i < NUM_LIGHT; i++) {
            vec3 L = normalize(uLightSource[i] - vertexPosition);
            float lambertian = max(dot(N, L), 0.0);
            float specularCoef = 0.0;

            if (lambertian > 0.0) {
                vec3 R = reflect(-L, N);                  // Reflected light vector
                vec3 V = normalize(-vertexPosition);      // Vector to viewer
                // Compute the specular term
                float specAngle = max(dot(R, V), 0.0);
                specularCoef = pow(specAngle, shininess);
            }

            diffuse += Kd * lambertian * uLightColor[i] * vColor;
            specular += Ks * specularCoef * uLightColor[i];
        }

        gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
    }
`;

const gouraudVsSource = `
    #define NUM_LIGHT 3
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec3 aFrontColor;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;

    varying vec4 vColor;

    precision mediump float;

    uniform float Ka;   // Ambient reflection coefficient
    uniform float Kd;   // Diffuse reflection coefficient
    uniform float Ks;   // Specular reflection coefficient
    uniform float shininess;
    
    uniform vec3 uLightSource[NUM_LIGHT];
    uniform vec3 uLightColor[NUM_LIGHT];

    void main(void) {
        vec4 vertexViewSpace = uModelViewMatrix * aVertexPosition;
        gl_Position = uProjectionMatrix * vertexViewSpace;
        vec3 vertexPosition = vec3(vertexViewSpace) / vertexViewSpace.w;
        
        vec3 normal = vec3(uNormalMatrix * vec4(aVertexNormal, 0.0));
        vec3 N = normalize(normal);

        vec3 ambient = Ka * aFrontColor;
        vec3 diffuse;
        vec3 specular;

        for (int i = 0; i < NUM_LIGHT; i++) {
            vec3 L = normalize(uLightSource[i] - vertexPosition);
            float lambertian = max(dot(N, L), 0.0);
            float specularCoef = 0.0;
            
            if (lambertian > 0.0) {
                vec3 R = reflect(-L, N);                  // Reflected light vector
                vec3 V = normalize(-vertexPosition); // Vector to viewer
                // Compute the specular term
                float specAngle = max(dot(R, V), 0.0);
                specularCoef = pow(specAngle, shininess);
            }

            diffuse += Kd * lambertian * uLightColor[i] * aFrontColor;
            specular += Ks * specularCoef * uLightColor[i];
        }

        vColor = vec4(ambient + diffuse + specular, 1.0);
    }
`;

const gouraudFsSource = `
    precision highp float;
    varying vec4 vColor;

    void main(void) {
        gl_FragColor = vColor;
    }
`;

const phongVsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec3 aFrontColor;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;

    varying vec3 vNormal;
    varying vec3 vVertexPosition;
    varying vec3 vColor;

    void main(void) {
        vec4 vertexViewSpace = uModelViewMatrix * aVertexPosition;
        gl_Position = uProjectionMatrix * vertexViewSpace;

        vVertexPosition = vec3(vertexViewSpace) / vertexViewSpace.w;
        vNormal = vec3(uNormalMatrix * vec4(aVertexNormal, 0.0));
        vColor = aFrontColor;
}
`;

const phongFsSource = `
    #define NUM_LIGHT 3
    precision mediump float;

    varying vec3 vNormal;
    varying vec3 vVertexPosition;
    varying vec3 vColor;

    uniform float Ka;   // Ambient reflection coefficient
    uniform float Kd;   // Diffuse reflection coefficient
    uniform float Ks;   // Specular reflection coefficient
    uniform float shininess;

    uniform vec3 uLightSource[NUM_LIGHT];
    uniform vec3 uLightColor[NUM_LIGHT];

    void main(void) {
        vec3 N = normalize(vNormal);

        vec3 ambient = Ka * vColor;
        vec3 diffuse;
        vec3 specular;

        for (int i = 0; i < NUM_LIGHT; i++) {
            vec3 L = normalize(uLightSource[i] - vVertexPosition);
            float lambertian = max(dot(N, L), 0.0);
            float specularCoef = 0.0;

            if(lambertian > 0.0) {
                vec3 R = reflect(-L, N);      // Reflected light vector
                vec3 V = normalize(-vVertexPosition); // Vector to viewer
                // Compute the specular term
                float specAngle = max(dot(R, V), 0.0);
                specularCoef = pow(specAngle, shininess);
            }

            diffuse += Kd * lambertian * uLightColor[i] * vColor;
            specular += Ks * specularCoef * uLightColor[i];
        }

        gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
    }
`;

mat4.shear = (out, a, lambda, axis) => {
    const shearMatrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];

    if (axis[0]) {
        shearMatrix[4] = lambda[0];
        shearMatrix[8] = lambda[1];
    } else if (axis[1]) {
        shearMatrix[1] = lambda[0];
        shearMatrix[9] = lambda[1];
    } else if (axis[2]) {
        shearMatrix[2] = lambda[0];
        shearMatrix[6] = lambda[1];
    }

    const shearMat4 = mat4.create();
    mat4.set(shearMat4, ...shearMatrix);
    mat4.transpose(shearMat4, shearMat4);
    mat4.multiply(out, a, shearMat4);
}

const initWebGL = (canvas) => {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    gl.getExtension('OES_standard_derivatives');
    gl.enable(gl.DEPTH_TEST);

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

const initShader = (gl, vsSource, fsSource) => {
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

const genProgram = (gl, vsSource, fsSource) => {
    const shaderProgram = initShader(gl, vsSource, fsSource);

    const programInfo = {
        program: shaderProgram,
        attribLocation: {
            position: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            normal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            color: gl.getAttribLocation(shaderProgram, 'aFrontColor'),
        },
        uniformLocation: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            directedLight: {
                source: gl.getUniformLocation(shaderProgram, 'uLightSource'),
                color: gl.getUniformLocation(shaderProgram, 'uLightColor'),
            },
            Ka: gl.getUniformLocation(shaderProgram, 'Ka'),
            Kd: gl.getUniformLocation(shaderProgram, 'Kd'),
            Ks: gl.getUniformLocation(shaderProgram, 'Ks'),
            shininess: gl.getUniformLocation(shaderProgram, 'shininess'),
        },
    };

    return programInfo;
}

const degToRad = (deg) => {
    return deg * Math.PI / 180;
}

const drawObject = (gl, programInfo, objectInfo) => {
    const {
        translate,
        rotation,
        scale,
        shear,
        directedLight,
        Ka,
        Kd,
        Ks,
        shininess,
        buffers } = objectInfo;
    const { degree, rotationAxis } = rotation;
    const { lambda, shearAxis } = shear;

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
                   translate);

    mat4.rotate(modelViewMatrix,
                modelViewMatrix,
                degree,
                rotationAxis);
    
    mat4.shear(modelViewMatrix,
               modelViewMatrix,
               lambda,
               shearAxis)

    mat4.scale(modelViewMatrix,
               modelViewMatrix,
               scale);
    
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    
    if (programInfo.attribLocation.position !== -1) {
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

    if (programInfo.attribLocation.normal !== -1) {
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
    
    if (programInfo.attribLocation.color !== -1) {
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
    if (programInfo.uniformLocation.projectionMatrix !== -1) {
        gl.uniformMatrix4fv(
            programInfo.uniformLocation.projectionMatrix,
            false,
            projectionMatrix);
    }
    
    if (programInfo.uniformLocation.normalMatrix !== -1) {
        gl.uniformMatrix4fv(
            programInfo.uniformLocation.normalMatrix,
            false,
            normalMatrix);
    }

    if (programInfo.uniformLocation.modelViewMatrix !== -1) {
        gl.uniformMatrix4fv(
            programInfo.uniformLocation.modelViewMatrix,
            false,
            modelViewMatrix);
    }
    
    const { source, color } = directedLight;
    
    gl.uniform3fv(
        programInfo.uniformLocation.directedLight.source,
        source);
    gl.uniform3fv(
        programInfo.uniformLocation.directedLight.color,
        color);
    gl.uniform1f(
        programInfo.uniformLocation.Ka,
        Ka);
    gl.uniform1f(
        programInfo.uniformLocation.Kd,
        Kd);
    gl.uniform1f(
        programInfo.uniformLocation.Ks,
        Ks);
    gl.uniform1f(
        programInfo.uniformLocation.shininess,
        shininess);
    
    {
        const offset = 0;
        const vertexCount = buffers.position.numItems;
        gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
    }
}

const animate = (gl, objectsInfo) => {
    let then = 0;

    const render = (now) => {
        now *= 0.001
        const deltaTime = now - then;
        then = now;

        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clearColor(...backgroundColor, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const objectInfo of objectsInfo) {
            const { programInfo } = objectInfo;
            drawObject(gl, programInfo, objectInfo);
            objectInfo.rotation.degree += deltaTime;
        }

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

const loadObjectInfo = async (gl) => {
    for (const object of objectsToDraw) {
        const programInfo = flatProgram;
        const data = await getObject(object);
        const buffers = initBuffer(gl, data);
        const translate = [0, 0, -50];
        const rotation = {
            degree: 0,
            rotationAxis: [0, 1, 0],
        };
        const scale = [1, 1, 1];
        const shear = {
            lambda: [0.1, 0.1],
            shearAxis: [0, 0, 0],
        };
        const directedLight = {
            source: [0, 100, 0, 100, 0, 0, 0, 0, 100],
            color: [0.3, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 0.0, 0.3],
        };
        let Ka = 1.0;
        let Kd = 1.0;
        let Ks = 1.0;
        let shininess = 80;

        objectInfo.push({
            programInfo,
            buffers,
            translate,
            rotation,
            scale,
            shear,
            directedLight,
            Ka,
            Kd,
            Ks,
            shininess,
        });
    }
}

const main = () => {
    const canvas = document.querySelector('#glcanvas');
    const gl = initWebGL(canvas);

    flatProgram = genProgram(gl, flatVsSource, flatFsSource);
    gouraudProgram = genProgram(gl, gouraudVsSource, gouraudFsSource);
    phongProgram = genProgram(gl, phongVsSource, phongFsSource);

    loadObjectInfo(gl).then(() => {
        animate(gl, objectInfo);
    });
}