/**
 * The Message.
 * @typedef {object} Message
 * @property {string} type The type of the message. (one of ['CONNECT', 'CONNACK', 'PUBLISH', 'PINGREQ', 'PINGRES'])
 * @property {string=} topic The topic of the message. (required for 'PUBLISH' type)
 * @property {string=} target Target appId. (required for ['PUBLISH', 'CONNACK', 'PINGREQ'] types)
 * @property {boolean} viaHub The message was brokered by the Hub.
 * @property {string=} token Hack-proof session token. (required for all types except 'CONNECT')
 * @property {*=} data Data to be passed with the message. Can be any type that is compatible with the structured clone algorithm,
 */

const targetOrigin = '*';

/**
 * Send message to target window.
 * @param {Message} message
 * @param {Window=} targetWindow
 */
export function postMessage(message, targetWindow) {
	if (!targetWindow) {
		targetWindow = window.top;
	}
	try {
		targetWindow.postMessage(message, targetOrigin);
	} catch (error) {
		if (
			error instanceof DOMException &&
			(error.name === 'DataCloneError' ||
				error.code === 25) /* DATA_CLONE_ERR */
		) {
			throw new Error(
				"ts.io.publish called with { data } argument that can't be cloned using the structural clone algorithm."
			);
		} else {
			console.warn('Something went wrong while sending postMessage.', error);
		}
	}
}

const messageQueue = [];

export function queueMessage(message, targetWindow) {
	if (!targetWindow) {
		targetWindow = window.top;
	}
	messageQueue.push({
		targetWindow,
		message
	});
}

export function flushQueue(token) {
	if (messageQueue.length) {
		messageQueue
			.reverse()
			.forEach(queuedMessage =>
				queuedMessage.targetWindow.postMessage(
					{ ...queuedMessage.message, token },
					targetOrigin
				)
			);
		return true;
	}
	return false;
}

/**
 * Validate message.
 * @param {Message} message
 */
export function messageValid(message) {
	return message && message.type;
}

function complexMessageValid(message) {
	return messageValid(message) && message.topic && message.target;
}

/**
 * Validate message for 'PUBLISH' type.
 * @param {Message} message
 */
export function publishMessageValid(message) {
	return complexMessageValid(message) && message.type === 'PUBLISH';
}

/**
 * Validate message for 'SPAWN' type.
 * @param {Message} message
 */
export function spawnMessageValid(message) {
	return complexMessageValid(message) && message.type === 'SPAWN';
}

/**
 * Message is sent to an App.
 * @param {Message} message
 */
export function appMessageValid(message) {
	return (
		messageValid(message) &&
		message.viaHub &&
		['CONNACK', 'PUBLISH', 'PING'].includes(message.type)
	);
}

/**
 * Message sent to the Hub.
 * @param {Message} message
 */
export function hubMessageValid(message) {
	return (
		messageValid(message) &&
		!message.viaHub &&
		['CONNECT', 'PUBLISH', 'PONG', 'SPAWN'].includes(message.type)
	);
}

/**
 * Does the topic match the expression?
 *
 * @todo Support more than '*' or exact match.
 *
 * @param {string} topicExpression Topic expression to match.
 * @param {string} topic Topic to match.
 */
export function matchTopic(topicExpression, topic) {
	if (topicExpression === '*') {
		return true;
	}
	return topicExpression === topic;
}
