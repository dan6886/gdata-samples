#!/bin/bash
# Copyright 2009 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


# This script will set subversion properties for this project.
# Run this script from the trunk:
#  $ cd /path/to/project/root/
#  $ etc/set_svn_properties.sh src


if test $# -eq 0 ; then
echo usage: "${0##/*} [Dir name]"
exit
fi
for i in $(find $1 -type d -not -path "*/.svn*") ; do
  echo "Setting svn:ignore on $i"
  svn propset svn:ignore -F etc/svn_ignores.txt $i
done

for i in $(find $1 -type f -name "*.gif") ; do
  echo "Found GIF at $i"
  svn propset svn:mime-type image/gif $i
done

for i in $(find $1 -type f -name "*.png") ; do
  echo "Found PNG at $i"
  svn propset svn:mime-type image/png $i
done

for i in $(find $1 -type f -name "*.jpg") ; do
  echo "Found JPEG at $i"
  svn propset svn:mime-type image/jpeg $i
done

#End

