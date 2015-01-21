var diff = resemble(file).compareTo(file2).ignoreColors().onComplete(function(data){
    console.log(data);
    /*
    {
      misMatchPercentage : 100, // %
      isSameDimensions: true, // or false
      dimensionDifference: { width: 0, height: -1 }, // defined if dimensions are not the same
      getImageDataUrl: function(){}
    }
    */
});