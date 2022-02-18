const EnhancedEventEmitter = require('protoo-server/lib/EnhancedEventEmitter');

class Aaaa extends EnhancedEventEmitter
{
	
	test()
	{
		console.log('sssssssssss');

		this.safeEmit('close');
	}
}

function main()
{
	const aaaa = new Aaaa();

	aaaa.on('close', () => 
	{
		console.log('dddddddddddvvvvvvvvvvvvvvvvvv');
	});
	
	console.log('ccccccccccc');
	
	aaaa.test();
	console.log('111111111111111111');
}

main();