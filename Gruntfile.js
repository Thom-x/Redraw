module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        nodewebkit: {
            options: {
                build_dir: './dist',
                winIco: './images/ico.ico',
                macIcns: './images/ico.ico',
                // choose what platforms to compile for here
                mac: true,
                win: true,
                linux32: true,
                linux64: true
            },
            src: [
            'package.json',
            './index.html',
            './js/**/*',
            './templates/**/*',
            './images/**/*',
            './css/**/*',
            './node_modules/bootstrap/dist/css/bootstrap.min.css',
            './node_modules/bootstrap/dist/fonts/**/*',
            './node_modules/jquery/dist/jquery.min.js',
            './node_modules/bootstrap/dist/js/bootstrap.min.js',
            './node_modules/resemblejs/resemble.js',
            './node_modules/mustache/mustache.min.js']
        }
    })

    grunt.loadNpmTasks('grunt-node-webkit-builder');
    grunt.registerTask('default', ['nodewebkit']);
};