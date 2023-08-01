import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();

const scene = new THREE.Scene();

const baseName = 'maquette_krimpen_cc_21-537684-346784';

let triangles = [];
let vertices = [];
let textures = [];


mtlLoader.load(`data/${baseName}.mtl`, materials => {
    materials.preload();
    objLoader.setMaterials(materials);
    objLoader.load(`data/${baseName}.obj`, object => {
        scene.add(object);
        scene.traverse(child => {
            if (child instanceof THREE.Mesh) {
                // Access to vertices
                vertices = child.geometry.attributes.position.array;
                const uvArray = child.geometry.attributes.uv.array // grab the uv array from the geometry
                triangles = [];
                
                if (child.geometry.index !== null) {
                    // Indexed BufferGeometry
                    const indices = child.geometry.index.array;
            
                    for (let i = 0; i < indices.length; i += 3) {
                        let aIndex = indices[i] * 3;
                        let bIndex = indices[i+1] * 3;
                        let cIndex = indices[i+2] * 3;

                        // Create THREE.Vector3 vertices
                        let a = new THREE.Vector3(vertices[aIndex], vertices[aIndex+1], vertices[aIndex+2]);
                        let b = new THREE.Vector3(vertices[bIndex], vertices[bIndex+1], vertices[bIndex+2]);
                        let c = new THREE.Vector3(vertices[cIndex], vertices[cIndex+1], vertices[cIndex+2]);

                        // If the mesh has any transformations applied, you'll need to apply them to the vertices as well.
                        if (child.matrixWorld) {
                            a.applyMatrix4(child.matrixWorld);
                            b.applyMatrix4(child.matrixWorld);
                            c.applyMatrix4(child.matrixWorld);
                        }

                        // Create a THREE.Triangle from the vertices
                        let triangle = new THREE.Triangle(a, b, c);

                        // Add the triangle to the triangles array
                        triangles.push(triangle);

                        // Get the indices of the uvs of the face
                        let aUVIndex = indices[i] * 2;
                        let bUVIndex = indices[i+1] * 2;
                        let cUVIndex = indices[i+2] * 2;

                        if (uvArray) {
                            // Create UV coordinates
                            let aUV = new THREE.Vector2(uvArray[aUVIndex], uvArray[aUVIndex + 1]);
                            let bUV = new THREE.Vector2(uvArray[bUVIndex], uvArray[bUVIndex + 1]);
                            let cUV = new THREE.Vector2(uvArray[cUVIndex], uvArray[cUVIndex + 1]);

                            // Add the uv coordinates to the uvs array
                            textures.push([aUV, bUV, cUV]);
                        }
                    }
                } else {
                    // Non-indexed BufferGeometry
                    for (let i = 0; i < vertices.length; i += 9) {
                        // Create THREE.Vector3 vertices directly from the positions array
                        let a = new THREE.Vector3(vertices[i], vertices[i+1], vertices[i+2]);
                        let b = new THREE.Vector3(vertices[i+3], vertices[i+4], vertices[i+5]);
                        let c = new THREE.Vector3(vertices[i+6], vertices[i+7], vertices[i+8]);

                        // If the mesh has any transformations applied, you'll need to apply them to the vertices as well.
                        if (child.matrixWorld) {
                            a.applyMatrix4(child.matrixWorld);
                            b.applyMatrix4(child.matrixWorld);
                            c.applyMatrix4(child.matrixWorld);
                        }

                        // Create a THREE.Triangle from the vertices
                        let triangle = new THREE.Triangle(a, b, c);

                        // Add the triangle to the triangles array
                        triangles.push(triangle);

                        if (uvArray) {
                            // Get the uvs for the face
                            let aUV = new THREE.Vector2(uvArray[i/3*2], uvArray[i/3*2 + 1]);
                            let bUV = new THREE.Vector2(uvArray[i/3*2 + 2], uvArray[i/3*2 + 3]);
                            let cUV = new THREE.Vector2(uvArray[i/3*2 + 4], uvArray[i/3*2 + 5]);

                            // Add the uv coordinates to the uvs array
                            textures.push([aUV, bUV, cUV]);
                        }
                    }
                }
                showTextures(textures);
            }
        });
    });
});



const textureLoader = new THREE.TextureLoader();

function showTextures(textures) {
    textureLoader.load(`data/texture_0.jpeg`, texture => {
        //const canvas = document.createElement('canvas');
        const canvas = document.getElementById('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = texture.image.width;
        canvas.height = texture.image.height;
        
        context.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // draw the uv triangles
        for (let i = 0; i < textures.length; i++) {
            const uvA = textures[i][0];
            const uvB = textures[i][1];
            const uvC = textures[i][2];
        
            const a = new THREE.Vector2(uvA.x * canvas.width, (1 - uvA.y) * canvas.height);
            const b = new THREE.Vector2(uvB.x * canvas.width, (1 - uvB.y) * canvas.height);
            const c = new THREE.Vector2(uvC.x * canvas.width, (1 - uvC.y) * canvas.height);
        
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.lineTo(c.x, c.y);
            context.closePath();
            context.strokeStyle = 'red';
            context.stroke();
            if (i < 100) {
                console.log(i);
            }
        }
    });
}
