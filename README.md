# Redraw
<img src="https://raw.githubusercontent.com/Thom-x/Redraw/master/images/ico.png" alt="alt text" width="30%" height="30%">

Demo Heroku : http://redrawhtml5.herokuapp.com

## Node Webkit : 
###Déploiment : 
    $ grunt
    
###Utilisation :
Nécessite un serveur lancé en local :
	
    $ node server.js

## Heroku : 
###Déploiment : 
    $ heroku login
    $ heroku git:clone -a redrawhtml5
    $ cd redrawhtml5
    $ git add .
    $ git commit -am "make it better"
    $ git push heroku master
    
###Test :

	$ npm install -g foreman
	$ nf start


