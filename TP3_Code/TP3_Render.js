TP3.Render = {
	drawTreeRough: function (rootNode, scene, alpha, radialDivisions = 8, leavesCutoff = 0.1, leavesDensity = 10, applesProbability = 0.05, matrix = new THREE.Matrix4()) {
		const stack = [rootNode];
		const branchGeometries = [];
		const leafGeometries = [];
		const appleGeometries = [];
	  
		while (stack.length > 0) {
		  const currentNode = stack.pop();
	  
		  for (const childNode of currentNode.childNode) {
			stack.push(childNode);

			// Longueur et orientation
			const p0 = currentNode.p0;
			const p1 = childNode.p1;
			const branchLength = p0.distanceTo(p1);

			// cylinder geometry
			const branchGeometry = new THREE.CylinderBufferGeometry(
			  childNode.a1, // Top radius
			  currentNode.a0,  // Bottom radius
			  branchLength, // Height
			  radialDivisions // Segments
			);

			// Creer la matrice de transformation
			const branchMatrix = new THREE.Matrix4();
			const direction = new THREE.Vector3().subVectors(p1, p0).normalize();
			const quaternion = new THREE.Quaternion();
			quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

			branchMatrix.makeRotationFromQuaternion(quaternion);
			branchMatrix.setPosition(
			  (p0.x + p1.x) / 2, // Midpoint x
			  (p0.y + p1.y) / 2, // Midpoint y
			  (p0.z + p1.z) / 2  // Midpoint z
			);

			branchGeometry.applyMatrix4(branchMatrix);
			branchGeometries.push(branchGeometry);

			// Ajouter des feuilles
			if(currentNode.a0 < alpha*leavesCutoff) {
				if (Math.random() > leavesCutoff) {
					for (let i = 0; i < leavesDensity; i++) {
						const leafGeometry = new THREE.PlaneBufferGeometry(alpha, alpha); // Leaf size

						// position autour des branches
						const leafPosition = new THREE.Vector3(
							p1.x + (Math.random() - 0.5) * alpha / 2,
							p1.y + (Math.random() - 0.5) * alpha / 2,
							p1.z + (Math.random() - 0.5) * alpha / 2
						);

						// orientation aleatoire
						const leafMatrix = new THREE.Matrix4();
						const leafQuaternion = new THREE.Quaternion();
						leafQuaternion.setFromEuler(new THREE.Euler(
							Math.random() * Math.PI,
							Math.random() * Math.PI,
							Math.random() * Math.PI
						));

						leafMatrix.makeRotationFromQuaternion(leafQuaternion);
						leafMatrix.setPosition(leafPosition);
						leafGeometry.applyMatrix4(leafMatrix);

						leafGeometries.push(leafGeometry);
					}
				}
				// Ajouter des pommes
				if (Math.random() < applesProbability) {
				  const appleGeometry = new THREE.BoxBufferGeometry(alpha, alpha, alpha); // Apple as a cube
		  
				  // position aleatoire des pommes
				  const applePosition = new THREE.Vector3(
					p0.x + Math.random() * (p1.x - p0.x), 
					p0.y + Math.random() * (p1.y - p0.y), 
					p0.z + Math.random() * (p1.z - p0.z)
				  );
		  
				  const appleMatrix = new THREE.Matrix4();
				  appleMatrix.setPosition(applePosition);
				  appleGeometry.applyMatrix4(appleMatrix);
		  
				  appleGeometries.push(appleGeometry);
				}
			}
		  }
		}
	  
		// Combiner les branches
		const mergedBranches = THREE.BufferGeometryUtils.mergeBufferGeometries(branchGeometries);
	  
		// Maillage final
		const branchMaterial = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
		const branchMesh = new THREE.Mesh(mergedBranches, branchMaterial);
		branchMesh.applyMatrix4(matrix); 
	  
		// Ajouter dans la scene
		scene.add(branchMesh);
	  
		// Combine tous les feuillles
		const mergedLeaves = THREE.BufferGeometryUtils.mergeBufferGeometries(leafGeometries);
	  
		// Mailage final
		const leafMaterial = new THREE.MeshPhongMaterial({ color: 0x3A5F0B, side: THREE.DoubleSide });
		const leafMesh = new THREE.Mesh(mergedLeaves, leafMaterial);
		leafMesh.applyMatrix4(matrix); 
	  
		// Ajouter dans la scene
		scene.add(leafMesh);
	  
		// Combiner tous les pommes
		const mergedApples = THREE.BufferGeometryUtils.mergeBufferGeometries(appleGeometries);
	  
		// Maillage final
		const appleMaterial = new THREE.MeshPhongMaterial({ color: 0x5F0B0B });
		const appleMesh = new THREE.Mesh(mergedApples, appleMaterial);
		appleMesh.applyMatrix4(matrix); 
	  
		// Ajouter dans la scene
		scene.add(appleMesh);
	},

	drawTreeHermite: function (rootNode, scene, alpha, leavesCutoff = 0.1, leavesDensity = 10, applesProbability = 0.05, matrix = new THREE.Matrix4()) {
		const stack = [rootNode];
		const branchGeometries = [];
		const leafGeometries = [];
		const appleGeometries = [];
		let leaveNodes = 0;
	
		// Generer les courbes de Hermite pour les branches
	
		while (stack.length > 0) {
			const currentNode = stack.pop();


			for (const childNode of currentNode.childNode) {
				stack.push(childNode);

				const sections = childNode.sections;

				let branchGeometry = new THREE.BufferGeometry();

				let positions = [];
				for(let section of sections){
					for(let point of section){
						positions.push(point.x, point.y, point.z);
					}
				}

				let indices = [];
				let bottomLeft;
				let bottomRight;
				let topRight;
				let topLeft;
				for(let i=0;i<sections.length-1;i++){
					for(let j=0;j<sections[i].length;j++){
						bottomLeft = i*sections[i].length + j;
						bottomRight = j === sections[i].length-1 ? i*sections[i].length : bottomLeft+1;
						topLeft = bottomLeft + sections[i].length;
						topRight = bottomRight + sections[i].length;
						indices.push(bottomLeft, bottomRight, topLeft);
						indices.push(bottomRight, topRight, topLeft);
					}
				}


				let f32positions =  new Float32Array(positions);
				childNode.f32TrunkSize = positions.length;
				branchGeometry.setAttribute("position", new THREE.BufferAttribute(f32positions, 3));
				branchGeometry.setIndex(indices);
				branchGeometry.computeVertexNormals();
				branchGeometries.push(branchGeometry);

				// Ajouter des feuilles
				if (currentNode.a0 < alpha * leavesCutoff) {
					currentNode.hasLeafs = true;
					leaveNodes++;
					for (let i = 0; i < leavesDensity; i++) {
						const leafGeometry = new THREE.PlaneBufferGeometry(alpha, alpha); // Leaf geometry
						const leafPosition = new THREE.Vector3(
							childNode.p1.x + (Math.random() - 0.5) * alpha,
							childNode.p1.y + (Math.random() - 0.5) * alpha,
							childNode.p1.z + (Math.random() - 0.5) * alpha
						);
	
						const leafMatrix = new THREE.Matrix4();
						const leafQuaternion = new THREE.Quaternion();
						leafQuaternion.setFromEuler(new THREE.Euler(
							Math.random() * Math.PI,
							Math.random() * Math.PI,
							Math.random() * Math.PI
						));
	
						leafMatrix.makeRotationFromQuaternion(leafQuaternion);
						leafMatrix.setPosition(leafPosition);
						leafGeometry.applyMatrix4(leafMatrix);
						currentNode.f32LeafSize += leafGeometry.attributes.position.array.length;
						leafGeometries.push(leafGeometry);
					}
	
					// Ajouter des pommes
					if (Math.random() < applesProbability) {
						const appleGeometry = new THREE.SphereBufferGeometry(alpha / 2, 16, 16);
						const applePosition = new THREE.Vector3(
							currentNode.p0.x + Math.random() * (childNode.p1.x - currentNode.p0.x),
							currentNode.p0.y + Math.random() * (childNode.p1.y - currentNode.p0.y),
							currentNode.p0.z + Math.random() * (childNode.p1.z - currentNode.p0.z)
						);
	
						const appleMatrix = new THREE.Matrix4();
						appleMatrix.setPosition(applePosition);
						appleGeometry.applyMatrix4(appleMatrix);
						currentNode.f32AppleSize = appleGeometry.attributes.position.array.length;
						appleGeometries.push(appleGeometry);
						currentNode.hasApple = true;
					}
				}
			}
		}
		// Combiner branch geometries
		const mergedBranches = THREE.BufferGeometryUtils.mergeBufferGeometries(branchGeometries);
		const branchMaterial = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
		const branchMesh = new THREE.Mesh(mergedBranches, branchMaterial);
		branchMesh.applyMatrix4(matrix);
		scene.add(branchMesh);
	
		// Combinerleaf geometries
		const mergedLeaves = THREE.BufferGeometryUtils.mergeBufferGeometries(leafGeometries);
		const leafMaterial = new THREE.MeshPhongMaterial({ color: 0x3A5F0B, side: THREE.DoubleSide });
		const leafMesh = new THREE.Mesh(mergedLeaves, leafMaterial);
		leafMesh.applyMatrix4(matrix);
		scene.add(leafMesh);
	
		// Combiner apple geometries
		const mergedApples = THREE.BufferGeometryUtils.mergeBufferGeometries(appleGeometries);
		const appleMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
		const appleMesh = new THREE.Mesh(mergedApples, appleMaterial);
		appleMesh.applyMatrix4(matrix);
		scene.add(appleMesh);

		return [mergedBranches, mergedLeaves, mergedApples];
	},

	updateTreeHermite: function (trunkGeometryBuffer, leavesGeometryBuffer, applesGeometryBuffer, rootNode) {
		const stack = [rootNode];
		let trunkProgress = 0;
		let leavesProgess = 0;
		let appleProgess = 0;
		let currentPoint;
		let apples =0;

		while (stack.length > 0) {
			const currentNode = stack.pop();
			for (const childNode of currentNode.childNode) {
				stack.push(childNode);

				for (let i = trunkProgress; i < trunkProgress + childNode.f32TrunkSize; i += 3) {
					currentPoint = new THREE.Vector3(trunkGeometryBuffer[i], trunkGeometryBuffer[i + 1], trunkGeometryBuffer[i + 2]);
					currentPoint.applyMatrix4(childNode.tranformationMatrix);
					trunkGeometryBuffer[i] = currentPoint.x;
					trunkGeometryBuffer[i + 1] = currentPoint.y;
					trunkGeometryBuffer[i + 2] = currentPoint.z;
				}
				trunkProgress += childNode.f32TrunkSize;

				if(childNode.hasLeafs){
					for(let i= leavesProgess ; i < leavesProgess+childNode.f32LeafSize; i+=3){
						currentPoint = new THREE.Vector3(leavesGeometryBuffer[i], leavesGeometryBuffer[i + 1], leavesGeometryBuffer[i + 2]);
						currentPoint.applyMatrix4(childNode.tranformationMatrix);
						leavesGeometryBuffer[i] = currentPoint.x;
						leavesGeometryBuffer[i + 1] = currentPoint.y;
						leavesGeometryBuffer[i + 2] = currentPoint.z;
					}
					leavesProgess += childNode.f32LeafSize;
				}

				if(childNode.hasApple){
					apples++;
					for(let i= appleProgess; i < appleProgess+childNode.f32AppleSize; i+=3){
						currentPoint = new THREE.Vector3(applesGeometryBuffer[i], applesGeometryBuffer[i + 1], applesGeometryBuffer[i + 2]);
						currentPoint.applyMatrix4(childNode.tranformationMatrix);
						applesGeometryBuffer[i] = currentPoint.x;
						applesGeometryBuffer[i + 1] = currentPoint.y;
						applesGeometryBuffer[i + 2] = currentPoint.z;
					}
					appleProgess += childNode.f32AppleSize;
				}
			}
		}
		console.log(apples);
	},

	drawTreeSkeleton: function (rootNode, scene, color = 0xffffff, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			points.push(currentNode.p0);
			points.push(currentNode.p1);

		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var material = new THREE.LineBasicMaterial({ color: color });
		var line = new THREE.LineSegments(geometry, material);
		line.applyMatrix4(matrix);
		scene.add(line);

		return line.geometry;
	},

	updateTreeSkeleton: function (geometryBuffer, rootNode) {

		var stack = [];
		stack.push(rootNode);

		var idx = 0;
		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}
			geometryBuffer[idx * 6] = currentNode.p0.x;
			geometryBuffer[idx * 6 + 1] = currentNode.p0.y;
			geometryBuffer[idx * 6 + 2] = currentNode.p0.z;
			geometryBuffer[idx * 6 + 3] = currentNode.p1.x;
			geometryBuffer[idx * 6 + 4] = currentNode.p1.y;
			geometryBuffer[idx * 6 + 5] = currentNode.p1.z;

			idx++;
		}
	},


	drawTreeNodes: function (rootNode, scene, color = 0x00ff00, size = 0.05, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			points.push(currentNode.p0);
			points.push(currentNode.p1);

		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var material = new THREE.PointsMaterial({ color: color, size: size });
		var points = new THREE.Points(geometry, material);
		points.applyMatrix4(matrix);
		scene.add(points);

	},


	drawTreeSegments: function (rootNode, scene, lineColor = 0xff0000, segmentColor = 0xffffff, orientationColor = 0x00ff00, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];
		var pointsS = [];
		var pointsT = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			const segments = currentNode.sections;
			for (var i = 0; i < segments.length - 1; i++) {
				points.push(TP3.Geometry.meanPoint(segments[i]));
				points.push(TP3.Geometry.meanPoint(segments[i + 1]));
			}
			for (var i = 0; i < segments.length; i++) {
				pointsT.push(TP3.Geometry.meanPoint(segments[i]));
				pointsT.push(segments[i][0]);
			}

			for (var i = 0; i < segments.length; i++) {

				for (var j = 0; j < segments[i].length - 1; j++) {
					pointsS.push(segments[i][j]);
					pointsS.push(segments[i][j + 1]);
				}
				pointsS.push(segments[i][0]);
				pointsS.push(segments[i][segments[i].length - 1]);
			}
		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var geometryS = new THREE.BufferGeometry().setFromPoints(pointsS);
		var geometryT = new THREE.BufferGeometry().setFromPoints(pointsT);

		var material = new THREE.LineBasicMaterial({ color: lineColor });
		var materialS = new THREE.LineBasicMaterial({ color: segmentColor });
		var materialT = new THREE.LineBasicMaterial({ color: orientationColor });

		var line = new THREE.LineSegments(geometry, material);
		var lineS = new THREE.LineSegments(geometryS, materialS);
		var lineT = new THREE.LineSegments(geometryT, materialT);

		line.applyMatrix4(matrix);
		lineS.applyMatrix4(matrix);
		lineT.applyMatrix4(matrix);

		scene.add(line);
		scene.add(lineS);
		scene.add(lineT);

	}
}
