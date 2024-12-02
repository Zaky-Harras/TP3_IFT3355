const appleMass = 0.075;

TP3.Physics = {
	initTree: function (rootNode) {

		this.computeTreeMass(rootNode);

		var stack = [];
		stack.push(rootNode);

		while (stack.length > 0) {
			var currentNode = stack.pop();
			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			currentNode.vel = new THREE.Vector3();
			currentNode.strength = currentNode.a0;
		}
	},

	computeTreeMass: function (node) {
		var mass = 0;

		for (var i = 0; i < node.childNode.length; i++) {
			mass += this.computeTreeMass(node.childNode[i]);
		}
		mass += node.a1;
		if (node.appleIndices !== null) {
			mass += appleMass;
		}
		node.mass = mass;

		return mass;
	},

	applyForces: async function (node, dt, time) {

		var u = Math.sin(1 * time) * 4;
		u += Math.sin(2.5 * time) * 2;
		u += Math.sin(5 * time) * 0.4;

		var v = Math.cos(1 * time + 56485) * 4;
		v += Math.cos(2.5 * time + 56485) * 2;
		v += Math.cos(5 * time + 56485) * 0.4;

		// Ajouter le vent
		node.vel.add(new THREE.Vector3(u / Math.sqrt(node.mass), 0, v / Math.sqrt(node.mass)).multiplyScalar(dt));
		// Ajouter la gravite
		node.vel.add(new THREE.Vector3(0, -node.mass, 0).multiplyScalar(dt));

		// TODO: Projection du mouvement, force de restitution et amortissement de la velocite
		await new Promise(r => setTimeout(r, 10));
		if(node.parentRotation){
			node.p0.applyMatrix4(node.parentRotation);
			p1_t_plus_dt = node.p1.clone().add(node.vel.clone().multiplyScalar(dt/100000));			//p1_t_plus_dt = p1_t + v * dt
			newVector = p1_t_plus_dt.clone().add(node.p0.clone().multiplyScalar(-1));				//newVector = p1_t_plus_dt - p0
			newVector.normalize();
			oldVector = node.p1.clone().add(node.p0.clone().multiplyScalar(-1));					//oldVector = p1_t - p0
			oldVector.normalize();
			rotationAngle = oldVector.angleTo(newVector);
			rotationMatrix = new THREE.Matrix4().makeRotationAxis(oldVector.clone().cross(newVector).normalize(), rotationAngle);	//Trouver matrix de rotation
			tranformationMatrix = rotationMatrix.multiply(node.parentRotation);
		} else {
			rotationMatrix = new THREE.Matrix4();
			tranformationMatrix = rotationMatrix;
		}
		old_p1 = node.p1;
		node.p1.applyMatrix4(tranformationMatrix); 													//Appliquer matrix de rotation à p1_t
		node.vel = old_p1.clone().add(node.p1.clone().addScalar(-1));							    //Remplacer l'ancienne velocite par la vrai velocite

		velRestitution = node.vel.clone().multiplyScalar(-0.5);
		velRestitution.x = velRestitution.x^2;
		velRestitution.y = velRestitution.y^2;
		velRestitution.z = velRestitution.z^2;
		velRestitution.multiplyScalar(node.a0*1000);
		node.vel.add(velRestitution);
		node.vel.multiplyScalar(0.7);

		// Appel recursif sur les enfants
		for (var i = 0; i < node.childNode.length; i++) {
			node.childNode[i].parentRotation = tranformationMatrix;
			this.applyForces(node.childNode[i], dt, time);
		}
	}
}