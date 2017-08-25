import axios from 'axios'
import base64 from 'base-64'

const initialState = {
  repository: null,
  repositories: {},

  trends: [],
}

const yyyymmdd = function (dat) {
  const mm = dat.getMonth() + 1 // getMonth() is zero-based
  const dd = dat.getDate()

  return [dat.getFullYear(), (mm > 9 ? '' : '0') + mm, (dd > 9 ? '' : '0') + dd].join('-')
}

export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_REPOSITORIES': {
      return {
        ...state,
        repositories: {
          ...state.repositories,
          [action.username]: action.data,
        },
      }
    }
    case 'START_FETCH_REPOSITORY': {
      return {
        ...state,
        repository: null,
      }
    }
    case 'FETCH_REPOSITORY': {
      return {
        ...state,
        repository: action.repository,
      }
    }
    case 'START_FETCH_TRENDS': {
      return {
        ...state,
        trends: [],
      }
    }
    case 'FETCH_TRENDS': {
      return {
        ...state,
        trends: action.repositories,
      }
    }
    default:
      return state
  }
}

export const fetchRepositories = username =>
  async (dispatch, getState) => {
    const now = new Date()
    now.setDate(now.getDate() - 7)
    const targetDate = yyyymmdd(now)
    const accessToken = getState().app.accessToken

    dispatch({
      type: 'START_FETCH_TREND',
    })
    axios({
      method: 'GET',
      url: `https://api.github.com/users/${username}/repos?type=all&sort=updated&direction=desc`,
      headers: {
        Accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
      .then(response => response.data)
      .then((data) => {
        dispatch({
          type: 'FETCH_REPOSITORIES',
          username,
          data,
        })
      })
      .catch((e) => {
        console.log(e)
      })
  }

export const fetchRepositoriesGraphql = username =>
  async (dispatch, getState) => {
    const accessToken = getState().app.accessToken
    dispatch({
      type: 'FETCH_REPOSITORIES',
    })
    axios({
      method: 'POST',
      url: 'https://api.github.com/graphql',
      headers: {
        Accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: {
        query: `{
          viewer {
            repositories(orderBy: {field: UPDATED_AT, direction: DESC}, first: 100) {
              edges {
                node {
                  name
                  updatedAt
                  stargazers {
                    totalCount
                  }
                  forks {
                    totalCount
                  }
                }
              }
            }
          }
        }`,
      },
    })
      .then(response => response.data.data)
      .then((data) => {
        dispatch({
          type: 'FETCH_REPOSITORIES',
          username,
          data: data.viewer.repositories.edges.map(e => e.node),
        })
      })
      .catch((e) => {
        console.log(e)
      })
  }

export const fetchRepository = (owner, repo) =>
  async (dispatch, getState) => {
    const accessToken = getState().app.accessToken
    dispatch({
      type: 'START_FETCH_REPOSITORY',
    })
    const data = await axios({
      method: 'GET',
      url: `https://api.github.com/repos/${owner}/${repo}`,
      // url: 'https://api.github.com/graphql',
      headers: {
        Accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
    })
      .then(response => response.data)

    const languages = await axios({
      method: 'GET',
      url: data.languages_url,
      headers: {
        Accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
    })
      .then(response => response.data)

    const topics = await axios({
      method: 'GET',
      url: `https://api.github.com/repos/${owner}/${repo}/topics`,
      headers: {
        Accept: 'application/vnd.github.mercy-preview+json',
        authorization: `Bearer ${accessToken}`,
      },
    })
      .then(response => response.data.names)

    data.languages = languages
    data.topics = topics

    try {
      const content = await axios({
        method: 'GET',
        url: `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
        headers: {
          Accept: 'application/vnd.github.mercy-preview+json',
          authorization: `Bearer ${accessToken}`,
        },
      })
        .then(response => response.data.content)

      const readme = base64.decode(content.replace(/\\n/g, ''))
      data.content = readme.toString()
    } catch (e) {

    }

    dispatch({
      type: 'FETCH_REPOSITORY',
      repository: data,
    })
    // .catch((e) => {
    //   console.log(e)
    // })
  }

export const fetchRepositoryGraphql = (owner, repo) =>
  async (dispatch, getState) => {
    const accessToken = getState().app.accessToken
    dispatch({
      type: 'START_FETCH_REPOSITORY',
    })
    axios({
      method: 'POST',
      url: 'https://api.github.com/graphql',
      headers: {
        Accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      data: {
        query: `{
          viewer {
            repository(name: "${repo}") {
              name
              commitComments(last: 1) {
                edges {
                  node {
                    body
                  }
                }
              }
              languages(last: 100) {
                edges {
                  node {
                    color
                    name
                  }
                }
              }
              repositoryTopics(last: 100) {
                edges {
                  node {
                    topic {
                      name
                    }
                  }
                }
              }
              forks {
                totalCount
              }
              stargazers {
                totalCount
              } 
              description
              isFork
              id
              url
              isPrivate
              pullRequests(first: 20, orderBy: {field: UPDATED_AT direction: DESC}) {
                edges {
                  node {
                      title
                  }
                }
              }
            }
          }
        }`,
      },
    })
      .then(response => response.data.data)
      .then((data) => {
        dispatch({
          type: 'FETCH_REPOSITORY',
          repository: data.viewer.repository,
        })
      })
      .catch((e) => {
        console.log(e)
      })
  }

export const startFetchTrends = () => ({
  type: 'START_FETCH_TREND',
})

export const fetchTrends = () =>
  async (dispatch, getState) => {
    const now = new Date()
    now.setDate(now.getDate() - 7)
    const targetDate = yyyymmdd(now)
    const accessToken = getState().app.accessToken

    axios({
      method: 'GET',
      url: `https://api.github.com/search/repositories?sort=stars&order=desc&q=language:java&q=created:>${targetDate}`,
      headers: {
        Accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
      .then(response => response.data)
      .then((data) => {
        dispatch({
          type: 'FETCH_TRENDS',
          repositories: data.items,
        })
      })
      .catch((e) => {
        console.log(e)
      })
  }
