import axios from 'axios'

const state = {
  config: {}
}

const getters = {
  getConfig: (state) => {
    return state.config
  },
}

const mutations = {
  SET_CONFIG (state, config) {
    state.config = config
  },
}

const actions = {
  updateConfig ({ commit, dispatch }) {
    axios.get('https://gist.githubusercontent.com/askz/90a7cd878374de4b088c002df05e526d/raw/ceb7f4478efef4bb76ab45f038cff6b1d4b01905/conf.json', {
      }).then(response => {
        commit('SET_CONFIG', response.data);
    });
  },
}


export default {
  state,
  getters,
  mutations,
  actions
}