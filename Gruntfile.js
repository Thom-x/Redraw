module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        nodewebkit: {
            options: {
                build_dir: './dist',
                // choose what platforms to compile for here
                mac: true,
                win: true,
                linux32: true,
                linux64: true
            },
            src: ['package.json','./index.html','./js/**/*','./templates/**/*','./images/**/*','./css/**/*','./node_modules/bootstrap/**/*','./node_modules/jquery/**/*','./node_modules/mustache/**/*','./node_modules/resemblejs/**/*']
        }
    })

    grunt.loadNpmTasks('grunt-node-webkit-builder');
    grunt.registerTask('default', ['nodewebkit']);
};