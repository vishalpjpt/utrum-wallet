/** ***************************************************************************
 * Copyright © 2018 Monaize Singapore PTE. LTD.                               *
 *                                                                            *
 * See the AUTHORS, and LICENSE files at the top-level directory of this      *
 * distribution for the individual copyright holder information and the       *
 * developer policies on copyright and licensing.                             *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * Monaize Singapore PTE. LTD software, including this file may be copied,    *
 * modified, propagated or distributed except according to the terms          *
 * contained in the LICENSE file                                              *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/
import { join as joinPath } from 'path';
import * as _ from 'lodash';

const fs = require('fs');
const electron = require('electron');

const checkValueExist = (value) => {
  if (value) {
    return value;
  }
  return '';
};

export default {
  name: 'library',
  data() {
    return {
      licenses: [],
    };
  },
  methods: {
    getLicenseString(index) {
      return this.licenses.indexOf(index).licenseString;
    },
    getPublicher(license) {
      return checkValueExist(license.github_owner);
    },
    getLicenses(license) {
      return checkValueExist(license.license);
    },
    getRepository(license) {
      return checkValueExist(license.url);
    },
    getVersion(license) {
      return checkValueExist(license.version);
    },
    openLink: (event) => {
      event.preventDefault();
      const link = event.target.href;
      electron.shell.openExternal(link);
    },
    formatEmail(license) {
      if (license.email) {
        return `(${license.email})`;
      }
      return '';
    },
  },
  computed: {
    isLicensesFilled() {
      return !(_.isEmpty(this.licenses));
    },
  },
  mounted() {
    let licences = '';
    if (process.env.NODE_ENV === 'development') {
      licences = joinPath(__dirname, '../../../../../resources/licenses.json');
    } else {
      licences = joinPath(process.resourcesPath, '/licenses.json');
    }

    fs.readFile(licences, (err, data) => {
      if (err) throw err;
      this.licenses  = JSON.parse(data.toString());
    });
  },
};
