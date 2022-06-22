#!/bin/bash
CONFLICTS=$(git ls-files -u | wc -l)
if [ "$CONFLICTS" -gt 0 ] ; then
   echo "There is a merge conflict. Aborting"
   git merge --abort
   exit 1

 else
   echo "There are no merge conflicts"

fi



