'use strict';

const objectsToDraw = ['Kangaroo', 'Teapot', 'Csie'];
const objectInfo = [];
const backgroundColor = [0, 0, 0];
const directedLight = {
    source: [0, 100, 0, 100, 0, 0, 0, 0, 100],
    color: [0.3, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 0.0, 0.3],
};
let flatProgram = null;
let gouraudProgram = null;
let phongProgram = null;

let imageLoaded = false;
const imageURL = 'wood.jpeg';

const flatVsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aFrontColor;
    attribute vec2 aTextureCoord;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelViewMatrix;

	varying vec4 vertexViewSpace;
    varying vec3 vColor;
    varying highp vec2 vTextureCoord;

    void main(void) {
        vertexViewSpace = uModelViewMatrix * aVertexPosition;
        gl_Position = uProjectionMatrix * vertexViewSpace;
        vColor = aFrontColor;
        vTextureCoord = aTextureCoord;
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
    varying highp vec2 vTextureCoord;
    
    uniform vec3 uLightSource[NUM_LIGHT];
    uniform vec3 uLightColor[NUM_LIGHT];
    uniform sampler2D uSampler;
    
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

        highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
        vec3 lighting = ambient + diffuse + specular;
        gl_FragColor = vec4(lighting * texelColor.rgb, texelColor.a);
    }
`;

const gouraudVsSource = `
    #define NUM_LIGHT 3
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec3 aFrontColor;
    attribute vec2 aTextureCoord;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;

    varying vec4 vColor;
    varying highp vec2 vTextureCoord;

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
        vTextureCoord = aTextureCoord;
    }
`;

const gouraudFsSource = `
    precision highp float;
    varying vec4 vColor;
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main(void) {
        highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor = vec4(vColor.rgb * texelColor.rgb, texelColor.a);
    }
`;

const phongVsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec3 aFrontColor;
    attribute vec2 aTextureCoord;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;

    varying vec3 vNormal;
    varying vec3 vVertexPosition;
    varying vec3 vColor;
    varying highp vec2 vTextureCoord;

    void main(void) {
        vec4 vertexViewSpace = uModelViewMatrix * aVertexPosition;
        gl_Position = uProjectionMatrix * vertexViewSpace;

        vVertexPosition = vec3(vertexViewSpace) / vertexViewSpace.w;
        vNormal = vec3(uNormalMatrix * vec4(aVertexNormal, 0.0));
        vColor = aFrontColor;
        vTextureCoord = aTextureCoord;
    }
`;

const phongFsSource = `
    #define NUM_LIGHT 3
    precision mediump float;

    varying vec3 vNormal;
    varying vec3 vVertexPosition;
    varying vec3 vColor;
    varying highp vec2 vTextureCoord;

    uniform float Ka;   // Ambient reflection coefficient
    uniform float Kd;   // Diffuse reflection coefficient
    uniform float Ks;   // Specular reflection coefficient
    uniform float shininess;

    uniform vec3 uLightSource[NUM_LIGHT];
    uniform vec3 uLightColor[NUM_LIGHT];
    uniform sampler2D uSampler;

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

        vec3 lighting = ambient + diffuse + specular;
        highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor = vec4(lighting * texelColor.rgb, texelColor.a);
    }
`;

const setupImage = (url) => {
    const image = document.createElement('img');

    image.src = url;

    image.addEventListener('load', () => {
        imageLoaded = true;
    });

    return image;
}

const updateTexture = (gl, texture, image) => {
    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);
}

mat4.shear = (out, a, lambda, axis) => {
    const shearMatrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];

    if (axis[0]) {
        shearMatrix[4] = lambda;
        shearMatrix[8] = lambda;
    } else if (axis[1]) {
        shearMatrix[1] = lambda;
        shearMatrix[9] = lambda;
    } else if (axis[2]) {
        shearMatrix[2] = lambda;
        shearMatrix[6] = lambda;
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

const initTextureCoord = (numItems) => {
    const textureCoord = [];
    for (let i = 0; i < 2 * numItems; ++i) {
        textureCoord.push(0.0);
    }

    return textureCoord;
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

    if (!object.vertexTextureCoords) {
        object.vertexTextureCoords = initTextureCoord(positionBuffer.numItems);
    }
    
    const textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                    new Float32Array(object.vertexTextureCoords),
                    gl.STATIC_DRAW);
    textureBuffer.itemSize = 2;
    textureBuffer.numItems = object.vertexTextureCoords.length / 2;

    return {
        position: positionBuffer,
        normal: normalBuffer,
        color: colorBuffer,
        texture: textureBuffer,
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
            texture: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
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
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
        },
    };

    return programInfo;
}

const degToRad = (deg) => {
    return deg * Math.PI / 180;
}

const resizeCanvas = (gl) => {
    const canvas = gl.canvas;
    
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    // Check if the canvas is not the same size.
    const needResize = canvas.width  !== displayWidth ||
                       canvas.height !== displayHeight;
    
    if (needResize) {
        // Make the canvas the same size
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
}

const drawObject = (gl, programInfo, objectInfo, texture) => {
    resizeCanvas(gl);
    const {
        object,
        translate,
        rotation,
        scale,
        shear,
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

    /* adjust for teapot as it is strangly large */
    if (object === 'Teapot') {
        translate[0] *= 10;
        translate[1] *= 15;
        translate[2] *= 18;
    }

    const fieldOfView = degToRad(45);
    const aspect = gl.canvas.width / gl.canvas.height;
    const zNear = 1;
    const zFar = 2000;

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

    if (buffers.texture) {
        const numComponents = buffers.texture.itemSize;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture);
        gl.vertexAttribPointer(
            programInfo.attribLocation.texture,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocation.texture);
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

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocation.uSampler, 0);
    
    {
        const offset = 0;
        const vertexCount = buffers.position.numItems;
        gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
    }

    /*
        Recover teapot to its original state,
        or it will grow exponentially.
    */
    if (object === 'Teapot') {
        translate[0] /= 10;
        translate[1] /= 15;
        translate[2] /= 18;
    }
}

const initTexture = (gl) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internelFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([255, 255, 255, 255]);

    gl.texImage2D(gl.TEXTURE_2D, level, internelFormat,
                  width, height, border, srcFormat, srcType,
                  pixel);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    return texture;
}

const animate = (gl, objectsInfo, texture, image) => {
    let then = 0;

    const render = (now) => {
        now *= 0.001
        const deltaTime = now - then;
        then = now;

        gl.clearColor(...backgroundColor, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const objectInfo of objectsInfo) {
            const { programInfo } = objectInfo;

            if (imageLoaded && objectInfo.object === 'Teapot') {
                updateTexture(gl, texture, image);
            } else {
                texture = initTexture(gl);
            }

            drawObject(gl, programInfo, objectInfo, texture);
            objectInfo.rotation.degree += deltaTime;
        }

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

const loadObjectInfo = async (gl) => {
    const objectCount = objectsToDraw.length;
    const maxX = 4;

    for (let i = 0; i < objectCount; ++i) {
        const object = objectsToDraw[i];
        const programInfo = flatProgram;
        const data = await getObject(object);
        const buffers = initBuffer(gl, data);

        const posX = (-maxX + (2 * maxX * (i + 1) / (objectCount + 1)));
        const posY = 0;
        const posZ = -5;

        const translate = [posX, posY, posZ];
        const rotation = {
            degree: 0,
            rotationAxis: [0, 1, 0],
        };
        const scale = [1, 1, 1];
        const shear = {
            lambda: 0,
            shearAxis: [1, 0, 0],
        };
        let Ka = 0.8;
        let Kd = 0.8;
        let Ks = 0.8;
        let shininess = 80;

        objectInfo.push({
            object,
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

    const texture = initTexture(gl);
    const image = setupImage(imageURL);

    loadObjectInfo(gl).then(() => {
        animate(gl, objectInfo, texture, image);
    });
}