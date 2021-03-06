module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        nwjs: {
            options: {
                build_dir: './dist',
                winIco: './images/ico.ico',
                macIcns: './images/ico.ico',
                // choose what platforms to compile for here
                mac: false,
                win: false,
                linux32: true,
                linux64: true
            },
            src: [
            './package.json',
            './server.js',
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
            './node_modules/socket.io/**/*',
            './node_modules/mustache-express/**/*',
            './node_modules/express/**/*',
            './node_modules/cheet.js/cheet.min.js',
            './node_modules/mustache/mustache.min.js',
            './bower_components/toastr/toastr.min.css',
            './bower_components/toastr/toastr.min.js',
            './node_modules/jquery.scrollto/jquery.scrollTo.min.js']
        },
        autoprefixer: {
            options: {
            },
            single_file: {
              options: {
              },
              src: 'css/style.css',
              dest: 'css/style.min.css'
            }
          }
    })
    grunt.loadNpmTasks('grunt-nw-builder');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.registerTask('default',['nwjs']);
    grunt.registerTask('build', ['autoprefixer']);
};