FROM rocketchat/base:12.14.0

ADD . /app

LABEL maintainer="buildmaster@rocket.chat"

# The version in debian stretch is too old and the video conversion is not made properly
# with video coming from mobile devices due to a rotation flag in the video file.
RUN echo "deb http://ftp.de.debian.org/debian buster main" >> /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y handbrake-cli

RUN set -x \
 && cd /app/bundle/programs/server \
 && npm install \
 && npm cache clear --force \
 && chown -R rocketchat:rocketchat /app

USER rocketchat

VOLUME /app/uploads

WORKDIR /app/bundle

# needs a mongoinstance - defaults to container linking with alias 'mongo'
ENV DEPLOY_METHOD=docker \
    NODE_ENV=production \
    MONGO_URL=mongodb://mongo:27017/rocketchat \
    HOME=/tmp \
    PORT=3000 \
    ROOT_URL=http://localhost:3000 \
    Accounts_AvatarStorePath=/app/uploads

EXPOSE 3000

CMD ["node", "main.js"]
