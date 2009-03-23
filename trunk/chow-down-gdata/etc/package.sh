svn export src thechowdown-appengine
cp README NOTICE LICENSE thechowdown-appengine
zip -r thechowdown-appengine-`date "+%Y%m%d"`.zip thechowdown-appengine
tar -cjvf thechowdown-appengine-`date "+%Y%m%d"`.tar.bz thechowdown-appengine
rm -rf thechowdown-appengine
